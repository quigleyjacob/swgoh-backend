#!/usr/bin/env python3
import sys
import json
from ortools.sat.python import cp_model

SCALE = 1  # global scale factor for all fractional scoring

def get_required_tier(zone_id):
    # Bonus zones
    if zone_id.startswith("Bonus:"):
        bonus_phase = zone_id.split(":")[1]
        return 9 if bonus_phase == "1" else 10

    # Normal zones: alignment:phase
    _, phase = zone_id.split(":")
    phase = int(phase)

    if phase == 1:
        return 7
    if phase == 2:
        return 8
    if phase == 3:
        return 9
    if phase == 4:
        return 10
    if phase in (5, 6):
        return 11

    raise ValueError(f"Unknown zone phase in zone_id: {zone_id}")


def build_common_model(payload):
    model = cp_model.CpModel()

    operation = payload["operation"]
    zones = operation["zones"]
    players = payload["players"]
    player_roster = payload["playerRoster"]
    unit_metadata = payload["unitMetadata"]
    unit_combat_type = payload["unitCombatType"]
    groups = payload["groups"]
    player_willingness = payload["playerWillingness"]

    roster_index = {
        player: {u["id"]: u for u in units}
        for player, units in player_roster.items()
    }

    def is_eligible(player, unit_id, zone_id):
        unit = roster_index.get(player, {}).get(unit_id)
        if not unit:
            return False
        if unit.get("rarity", 0) < 7:
            return False

        combat_type = unit_combat_type.get(unit_id)
        if combat_type == 2:  # ship
            return True
        if combat_type == 1:  # toon
            required_tier = get_required_tier(zone_id)
            return unit.get("tier", 0) >= required_tier
        return False

    # ------------------------------------------------------------
    # Variables
    # ------------------------------------------------------------

    x = {}   # x[zone][op][slot_key][player]
    y = {}   # y[zone][op]
    I = {}
    I_scaled = {}
    group_counts = {}
    tier_terms = []
    attract_terms = []
    repulse_penalty_terms = []

    # ------------------------------------------------------------
    # y[z][o] — operation activation
    # ------------------------------------------------------------
    for zone in zones:
        zone_id = zone["id"]
        y[zone_id] = {}
        for op_id in zone["operations"].keys():
            y[zone_id][op_id] = model.NewBoolVar(f"y_{zone_id}_{op_id}")

    # ------------------------------------------------------------
    # x[p,z,o,slot_key] — slot-level assignment
    # ------------------------------------------------------------
    for zone in zones:
        zone_id = zone["id"]
        x[zone_id] = {}

        for op_id, slot_list in zone["operations"].items():
            x[zone_id][op_id] = {}

            for slot in slot_list:
                slot_key = slot["key"]
                unit_id = slot["defId"]

                x[zone_id][op_id][slot_key] = {}
                terms = []

                for player in players:
                    if not is_eligible(player, unit_id, zone_id):
                        continue

                    var = model.NewBoolVar(f"x_{player}_{slot_key}")
                    x[zone_id][op_id][slot_key][player] = var
                    terms.append(var)

                # operation activation constraint
                if terms:
                    model.Add(sum(terms) == y[zone_id][op_id])
                else:
                    model.Add(y[zone_id][op_id] == 0)

    # ------------------------------------------------------------
    # per-player cap per zone
    # ------------------------------------------------------------
    MAX_PER_PLAYER_PER_ZONE = 10

    for zone in zones:
        zone_id = zone["id"]

        for player in players:
            terms = []
            for op_id, slot_list in zone["operations"].items():
                for slot in slot_list:
                    slot_key = slot["key"]
                    var = x.get(zone_id, {}).get(op_id, {}).get(slot_key, {}).get(player)
                    if var is not None:
                        terms.append(var)

            if terms:
                model.Add(sum(terms) <= MAX_PER_PLAYER_PER_ZONE)

    # each player-unit used at most once (across all zones and operations)
    for player in players:
        units = player_roster.get(player, [])
        for unit in units:
            unit_id = unit["id"]
            terms = []
            for zone in zones:
                zone_id = zone["id"]
                for op_id, slot_list in zone["operations"].items():
                    for slot in slot_list:
                        if slot["defId"] != unit_id:
                            continue
                        slot_key = slot["key"]
                        var = x.get(zone_id, {}).get(op_id, {}).get(slot_key, {}).get(player)
                        if var is not None:
                            terms.append(var)
            if terms:
                model.Add(sum(terms) <= 1)


    # ------------------------------------------------------------
    # investment I[p]
    # ------------------------------------------------------------
    for player in players:
        I[player] = model.NewIntVar(0, 1_000 * SCALE, f"I_{player}")
        I_scaled[player] = model.NewIntVar(0, 1_000 * SCALE, f"I_scaled_{player}")

    for player in players:
        terms = []
        for zone in zones:
            zone_id = zone["id"]
            for op_id, slot_list in zone["operations"].items():
                for slot in slot_list:
                    slot_key = slot["key"]
                    unit_id = slot["defId"]
                    var = x.get(zone_id, {}).get(op_id, {}).get(slot_key, {}).get(player)
                    if var is None:
                        continue
                    raw_weight = unit_metadata.get(unit_id, {}).get("weight", 1.0)
                    weight = int(raw_weight * SCALE)
                    terms.append(weight * var)
        model.Add(sum(terms) == I[player])

    # ------------------------------------------------------------
    # scaled investment
    # ------------------------------------------------------------
    for player in players:
        w = float(player_willingness.get(player, 1.0))
        model.Add(I_scaled[player] * SCALE == int(SCALE / w) * I[player])

    # ------------------------------------------------------------
    # group counts
    # ------------------------------------------------------------
    for player in players:
        group_counts[player] = {}

        for group in groups:
            gname = group["name"]
            Cpg = model.NewIntVar(0, 1000, f"C_{player}_{gname}")
            group_counts[player][gname] = Cpg

            terms = []
            for zone in zones:
                zone_id = zone["id"]
                for op_id, slot_list in zone["operations"].items():
                    for slot in slot_list:
                        slot_key = slot["key"]
                        unit_id = slot["defId"]
                        var = x.get(zone_id, {}).get(op_id, {}).get(slot_key, {}).get(player)
                        if var is None:
                            continue
                        if unit_id in group["units"]:
                            terms.append(var)

            model.Add(sum(terms) == Cpg)

    # ------------------------------------------------------------
    # repulsive groups
    # ------------------------------------------------------------
    lambda_r = SCALE

    for player in players:
        for group in groups:
            if group["type"] != "repulsive":
                continue

            gname = group["name"]
            Cpg = group_counts[player][gname]

            Rpg = model.NewIntVar(0, 1000, f"R_{player}_{gname}")
            model.Add(Rpg >= Cpg - 1)
            model.Add(Rpg >= 0)

            repulse_penalty_terms.append(lambda_r * Rpg)

    # ------------------------------------------------------------
    # attractive groups
    # ------------------------------------------------------------
    lambda_a = SCALE

    for player in players:
        for zone in zones:
            zone_id = zone["id"]
            for op_id, slot_list in zone["operations"].items():
                for slot in slot_list:
                    slot_key = slot["key"]
                    unit_id = slot["defId"]
                    var = x.get(zone_id, {}).get(op_id, {}).get(slot_key, {}).get(player)
                    if var is None:
                        continue
                    for group in groups:
                        if group["type"] == "attractive" and unit_id in group["units"]:
                            attract_terms.append(var)

    # ------------------------------------------------------------
    # tier preference
    # ------------------------------------------------------------
    lambda_t = SCALE

    for player in players:
        for zone in zones:
            zone_id = zone["id"]
            for op_id, slot_list in zone["operations"].items():
                for slot in slot_list:
                    slot_key = slot["key"]
                    unit_id = slot["defId"]
                    var = x.get(zone_id, {}).get(op_id, {}).get(slot_key, {}).get(player)
                    if var is None:
                        continue
                    tier = roster_index.get(player, {}).get(unit_id, {}).get("tier", 1)
                    gamma = int((1.0 / max(1, tier)) * SCALE)
                    tier_terms.append(gamma * var)

    return {
        "model": model,
        "zones": zones,
        "players": players,
        "x": x,
        "y": y,
        "I": I,
        "I_scaled": I_scaled,
        "group_counts": group_counts,
        "tier_terms": tier_terms,
        "attract_terms": attract_terms,
        "repulse_penalty_terms": repulse_penalty_terms,
    }



def solve_stage1(common):
    model = common["model"]
    y = common["y"]

    y_terms = []
    for zone_id, ops in y.items():
        for op_id, var in ops.items():
            y_terms.append(var)

    model.Maximize(sum(y_terms))

    solver = cp_model.CpSolver()
    # solver.parameters.log_search_progress = True
    solver.Solve(model)

    k_star = 0
    for zone_id, ops in y.items():
        for op_id, var in ops.items():
            if solver.Value(var):
                k_star += 1

    return solver, k_star


def solve_stage2(common, k_star):
    model = common["model"]
    y = common["y"]
    I_scaled = common["I_scaled"]
    tier_terms = common["tier_terms"]
    attract_terms = common["attract_terms"]
    repulse_penalty_terms = common["repulse_penalty_terms"]

    y_terms = []
    for zone_id, ops in y.items():
        for op_id, var in ops.items():
            y_terms.append(var)
    model.Add(sum(y_terms) == k_star)

    Imax = model.NewIntVar(0, 1_000 * SCALE, "Imax")
    Imin = model.NewIntVar(0, 1_000 * SCALE, "Imin")

    for player, var in I_scaled.items():
        model.Add(var <= Imax)
        model.Add(var >= Imin)

    objective_terms = [Imax, -Imin]
    if repulse_penalty_terms:
        objective_terms.append(sum(repulse_penalty_terms))
    lambda_a = SCALE
    if attract_terms:
        objective_terms.append(-lambda_a * sum(attract_terms))
    lambda_t = SCALE
    if tier_terms:
        objective_terms.append(-lambda_t * sum(tier_terms))

    model.Minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.Solve(model)

    return solver, Imax, Imin


def extract_result(common, solver):
    zones = common["zones"]
    players = common["players"]
    x = common["x"]
    I = common["I"]
    I_scaled = common["I_scaled"]

    placements_by_zone = {}
    for zone in zones:
        zone_id = zone["id"]
        placements_by_zone[zone_id] = {}
        for op_id, unit_list in zone["operations"].items():
            op_placements = []
            for unit in unit_list:
                for player in players:
                    var = x.get(zone_id, {}).get(op_id, {}).get(unit["key"], {}).get(player)
                    if var is not None and solver.Value(var):
                        op_placements.append({"player": player, "unit": unit})
            placements_by_zone[zone_id][op_id] = op_placements

    per_player_summary = {}
    for player in players:
        per_player_summary[player] = {
            "totalWeight": solver.Value(I[player]),
            "scaledWeight": solver.Value(I_scaled[player]),
            "zones": {},
        }
        for zone in zones:
            zone_id = zone["id"]
            per_player_summary[player]["zones"][zone_id] = {}
            for op_id in zone["operations"].keys():
                placements = [
                    u["unit"]
                    for u in placements_by_zone[zone_id][op_id]
                    if u["player"] == player
                ]
                if placements:
                    per_player_summary[player]["zones"][zone_id][op_id] = placements

    return placements_by_zone, per_player_summary


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw)

    common = build_common_model(payload)
    solver1, k_star = solve_stage1(common)
    solver2, Imax, Imin = solve_stage2(common, k_star)

    placements_by_zone, per_player_summary = extract_result(common, solver2)

    result = {
        "Kstar": k_star,
        "placementsByZone": placements_by_zone,
        "perPlayerSummary": per_player_summary,
        "fairness": {
            "Imax": solver2.Value(Imax),
            "Imin": solver2.Value(Imin),
        },
        "scale": SCALE,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
