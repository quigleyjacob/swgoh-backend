import { Image, createCanvas } from "canvas";
import { getImageFromS3 } from "./aws.js";
import { MyError } from "../utils/error.js";

/* ============================================================
   SPACING CONSTANTS — MEDIUM (S2)
   ============================================================ */

export const BOARD_TITLE_HEIGHT = 40;
export const BOARD_FOOTER_HEIGHT = 40;

export const ZONE_PADDING = 10;
export const SQUAD_PADDING = 10;
export const VERTICAL_SQUAD_PADDING = 5;

export const SQUAD_HEADER_HEIGHT = 22;
export const STATUS_BAR_HEIGHT = 6;

export const PORTRAIT_MAX_WIDTH = 64;
export const PORTRAIT_MAX_HEIGHT = 64;
export const PORTRAIT_PADDING = 6;

export const NAME_TEXT_HEIGHT = 14;
export const EXTRA_VERTICAL_PADDING = 12;
export const NAME_EXTRA_OFFSET = 15;

export const UNIT_GAP = 8;

/* ============================================================
   FIXED UNIT CELL DIMENSIONS
   ============================================================ */

export const UNIT_CELL_WIDTH =
    PORTRAIT_MAX_WIDTH + PORTRAIT_PADDING * 2;

export const UNIT_CELL_HEIGHT =
    STATUS_BAR_HEIGHT * 2 +
    PORTRAIT_MAX_HEIGHT +
    PORTRAIT_PADDING * 2 +
    NAME_TEXT_HEIGHT +
    //   EXTRA_VERTICAL_PADDING +
    NAME_EXTRA_OFFSET;

/* ============================================================
   SQUAD & ZONE DIMENSIONS
   ============================================================ */

export const SQUAD_HEIGHT =
    SQUAD_HEADER_HEIGHT +
    UNIT_CELL_HEIGHT +
    SQUAD_PADDING * 2;

export const SQUAD_WIDTH =
    (UNIT_CELL_WIDTH + UNIT_GAP) * 6 + SQUAD_PADDING * 2;

/* ============================================================
   IMAGE LOADING
   ============================================================ */

export async function loadCanvasImages(home, away, characterMap, renderMode) {
  const loadingTasks = [];

  // Helper: load all units for a given side
  const loadSideUnits = (side) => {
    if (!side || !side.duelStatus || side.duelStatus.length === 0) {
      return;
    }

    side.duelStatus.forEach(zone => {
      zone.warSquad.forEach(squad => {
        squad.squad.cell.forEach(unit => {
          const baseId = unit.unitDefId.split(":")[0];
          const character = characterMap[baseId];
          if (!character) return;

          const imageId = character.thumbnailName;

          loadingTasks.push({
            data: { baseId },
            promise: getCanvasImage(`toon-portraits/${imageId}.png`, "swgoh-images")
          });
        });
      });
    });
  };

  // Decide which sides to load based on renderMode
  if (renderMode === "home") {
    loadSideUnits(home);
  } else if (renderMode === "away") {
    loadSideUnits(away);
  } else { // both
    loadSideUnits(home);
    loadSideUnits(away);
  }

  // Always load Quigbot footer assets
  loadingTasks.push({
    data: { baseId: "quigbot_logo" },
    promise: getCanvasImage("quigbot.png", "swgoh-images")
  });
  loadingTasks.push({
    data: { baseId: 'zeta'},
    promise: getCanvasImage("tex.skill_zeta_glow.png", "swgoh-images")
  })
  loadingTasks.push({
    data: { baseId: 'omicron'},
    promise: getCanvasImage("omicron-badge.png", "swgoh-images")
  })
  loadingTasks.push({
    data: { baseId: 'relic-dark'},
    promise: getCanvasImage("relic-badge--dark-side.png", "swgoh-images")
  })
    loadingTasks.push({
    data: { baseId: 'relic-light'},
    promise: getCanvasImage("relic-badge--light-side.png", "swgoh-images")
  })
    loadingTasks.push({
    data: { baseId: 'relic-neutral'},
    promise: getCanvasImage("relic-badge--neutral.png", "swgoh-images")
  })
    loadingTasks.push({
    data: { baseId: 'relic-ultimate'},
    promise: getCanvasImage("relic-badge--ultimate.png", "swgoh-images")
  })
      loadingTasks.push({
    data: { baseId: 'gear'},
    promise: getCanvasImage("character-level-bg--normal.png", "swgoh-images")
  })
  // Execute all loads
  const promises = loadingTasks.map(task => task.promise);
  const loadedImages = await Promise.all(promises);

  // Build final map
  const imagesMap = {};
  loadingTasks.forEach((task, index) => {
    imagesMap[task.data.baseId] = loadedImages[index];
  });
  return imagesMap;
}

export async function getCanvasImage(key, bucket = undefined) {
    const image = new Image();
    try {
        const buffer = await getImageFromS3(key, bucket);
        image.src = buffer
    } catch(err) {
        console.log(err)
    }
    return image

}

/* ============================================================
   COLORS
   ============================================================ */

export const HOME_ZONE_FILL = "rgba(40, 80, 160, 0.08)";
export const HOME_ZONE_STROKE = "rgba(80, 140, 220, 0.25)";

export const AWAY_ZONE_FILL = "rgba(160, 40, 40, 0.08)";
export const AWAY_ZONE_STROKE = "rgba(220, 80, 80, 0.25)";

export const DEFEATED_ZONE_FILL = 'rgba(120,120,120,0.20)'
export const DEFEATED_ZONE_STROKE = 'rgba(180,180,180,0.35)'

/* ============================================================
   BOARD DIMENSIONS
   ============================================================ */

export function getGacBoardDimensions(playerStatus, flipColumns = false) {
    if(!playerStatus || !playerStatus.duelStatus) {
        return {
            width: 0,
            height : 0,
            zoneDimensions: {}
        }
    }
    const zoneDimensions = {};

    playerStatus.duelStatus.forEach(zone => {
        const zoneId = zone.zoneStatus.zoneId;
        const squadCount = zone.squadCapacity;

        const zoneHeight =
            ZONE_PADDING * 2 +
            SQUAD_HEIGHT * squadCount +
            VERTICAL_SQUAD_PADDING * (squadCount - 1);

        zoneDimensions[zoneId] = {
            x: 0,
            y: 0,
            width: SQUAD_WIDTH + ZONE_PADDING * 2,
            height: zoneHeight
        };
    });

    const col1Width = Math.max(
        zoneDimensions["4zone_phase01_conflict01_duel01"].width,
        zoneDimensions["4zone_phase01_conflict02_duel01"].width
    );

    const col2Width = Math.max(
        zoneDimensions["4zone_phase02_conflict01_duel01"].width,
        zoneDimensions["4zone_phase02_conflict02_duel01"].width
    );

    const row1Height = Math.max(
        zoneDimensions["4zone_phase01_conflict01_duel01"].height,
        zoneDimensions["4zone_phase02_conflict01_duel01"].height
    );

    const row2Height = Math.max(
        zoneDimensions["4zone_phase01_conflict02_duel01"].height,
        zoneDimensions["4zone_phase02_conflict02_duel01"].height
    );

    const width = col1Width + col2Width;
    const height =
        BOARD_TITLE_HEIGHT +
        row1Height +
        row2Height +
        BOARD_FOOTER_HEIGHT;

    // Y positions
    zoneDimensions["4zone_phase01_conflict01_duel01"].y = BOARD_TITLE_HEIGHT;
    zoneDimensions["4zone_phase01_conflict02_duel01"].y =
        BOARD_TITLE_HEIGHT + row1Height;

    zoneDimensions["4zone_phase02_conflict01_duel01"].y = BOARD_TITLE_HEIGHT;
    zoneDimensions["4zone_phase02_conflict02_duel01"].y =
        BOARD_TITLE_HEIGHT + row1Height;

    if (!flipColumns) {
        // Away side (normal)
        zoneDimensions["4zone_phase01_conflict01_duel01"].x = 0;
        zoneDimensions["4zone_phase01_conflict02_duel01"].x = 0;

        zoneDimensions["4zone_phase02_conflict01_duel01"].x = col1Width;
        zoneDimensions["4zone_phase02_conflict02_duel01"].x = col1Width;
    } else {
        // Home side (H1 flip)
        zoneDimensions["4zone_phase02_conflict01_duel01"].x = 0;
        zoneDimensions["4zone_phase02_conflict02_duel01"].x = 0;

        zoneDimensions["4zone_phase01_conflict01_duel01"].x = col2Width;
        zoneDimensions["4zone_phase01_conflict02_duel01"].x = col2Width;
    }

    return { width, height, zoneDimensions };
}

/* ============================================================
   MAIN DRAW FUNCTION — Correct Background Scaling
   ============================================================ */

export async function drawFullBoard(board, characterMap, player, opponent, renderMode = 'both') {
    const home = board.homeStatus;
    const away = board.awayStatus;
    const imagesMap = await loadCanvasImages(home, away, characterMap, renderMode)

    let awayAvailable = away !== null && away !== undefined

    if(!awayAvailable) {
        return drawPlaceholder(`No defense data available`, imagesMap)
    }

    const homeDims = getGacBoardDimensions(home, true)
    const awayDims = getGacBoardDimensions(away, false)

    let logicalWidth;
    let logicalHeight;

    if (renderMode === "home") {
        logicalWidth = homeDims.width;
        logicalHeight = homeDims.height;
    } else if (renderMode === "away") {
        logicalWidth = awayDims.width;
        logicalHeight = awayDims.height;
    } else {
        logicalWidth = homeDims.width + awayDims.width;
        logicalHeight = Math.max(homeDims.height, awayDims.height);
    }

    const canvas = createCanvas(logicalWidth, logicalHeight);
    const ctx = canvas.getContext("2d");

    if (renderMode === "home") {
        drawSideBackground(ctx, 0, 0, homeDims.width, logicalHeight, "home");
    } else if (renderMode === "away") {
        drawSideBackground(ctx, 0, 0, awayDims.width, logicalHeight, "away");
    } else {
        drawSideBackground(ctx, 0, 0, homeDims.width, logicalHeight, "home");
        drawSideBackground(ctx, homeDims.width, 0, awayDims.width, logicalHeight, "away");
    }

    drawVignette(ctx, logicalWidth, logicalHeight);

    if (renderMode === "home") {
        drawBoardSide(ctx, home, imagesMap, characterMap, player, "home");
    } else if (renderMode === "away") {
        drawBoardSide(ctx, away, imagesMap, characterMap, opponent, "away");
    } else {
        ctx.save();
        ctx.translate(0, 0);
        drawBoardSide(ctx, home, imagesMap, characterMap, player, "home");
        ctx.restore();

        ctx.save();
        let offsetX = homeDims.width
        ctx.translate(offsetX, 0);
        drawBoardSide(ctx, away, imagesMap, characterMap, opponent, "away", offsetX);
        ctx.restore();
    }

    drawFooter(ctx, logicalWidth, logicalHeight, imagesMap["quigbot_logo"]);

    return canvas.toBuffer("image/png", { compressionLevel: 9 });
}

/* ============================================================
   DRAW ONE SIDE
   ============================================================ */

export function drawBoardSide(ctx, sideStatus, imagesMap, characterMap, account, side, offset = 0) {
    const dims = getGacBoardDimensions(sideStatus, side === "home");

    drawTitleBar(
        ctx,
        dims.width,
        `${account.name} (${account.allyCode})`,
        side
    );

    const midX = dims.width / 2;
    drawSectionDivider(ctx, midX, dims.height);

    sideStatus.duelStatus.forEach(zone => {
        const zoneId = zone.zoneStatus.zoneId;
        const zd = dims.zoneDimensions[zoneId];

        const isHome = side === "home";

        drawGroupBox(
            ctx,
            zd.x + 4,
            zd.y + 4,
            zd.width - 8,
            zd.height - 8,
            {
                fill: isHome ? HOME_ZONE_FILL : AWAY_ZONE_FILL,
                stroke: isHome ? HOME_ZONE_STROKE : AWAY_ZONE_STROKE,
                radius: 10,
                lineWidth: 2
            }
        );

        zone.warSquad.forEach((squad, i) => {
            const squadX = zd.x + ZONE_PADDING;
            const squadY =
                zd.y +
                ZONE_PADDING +
                i * SQUAD_HEIGHT +
                i * VERTICAL_SQUAD_PADDING;

            const defeated = squad.squadStatus === 3

            drawGroupBox(ctx, squadX, squadY, SQUAD_WIDTH, SQUAD_HEIGHT, {
                fill: defeated ? DEFEATED_ZONE_FILL : isHome ? HOME_ZONE_FILL : AWAY_ZONE_FILL,
                stroke: defeated ? DEFEATED_ZONE_STROKE : isHome ? HOME_ZONE_STROKE : AWAY_ZONE_STROKE,
                radius: 8,
                lineWidth: 2
            });

            drawSquadHeader(ctx, squadX, squadY, SQUAD_WIDTH, squad.successfulDefends, squad.power);

            squad.squad.cell.forEach((unit, unitIndex) => {
                if (unitIndex >= 6) return;

                const baseId = unit.unitDefId.split(":")[0];
                const image = imagesMap[baseId];
                const character = characterMap[baseId];
                if (!image || !character) return;

                const unitX =
                    squadX +
                    SQUAD_PADDING +
                    unitIndex * (UNIT_CELL_WIDTH + UNIT_GAP);

                const unitY =
                    squadY + SQUAD_HEADER_HEIGHT + SQUAD_PADDING;

                drawStatusBars(ctx, unitX, unitY, unit);

                const portraitFrameX = unitX;
                const portraitFrameY = unitY + STATUS_BAR_HEIGHT * 2 + 4;

                drawPortraitFrame(
                    ctx,
                    portraitFrameX,
                    portraitFrameY,
                    UNIT_CELL_WIDTH,
                    PORTRAIT_MAX_HEIGHT + PORTRAIT_PADDING * 2
                );

                const innerX = portraitFrameX + PORTRAIT_PADDING;
                const innerY = portraitFrameY + PORTRAIT_PADDING;

                const isDead =
                    squad.squadStatus === 3 ||
                    (unit.unitState.healthPercent === "0");

                ctx.save();

                const r = 10;
                ctx.beginPath();
                ctx.moveTo(innerX + r, innerY);
                ctx.lineTo(innerX + PORTRAIT_MAX_WIDTH - r, innerY);
                ctx.quadraticCurveTo(innerX + PORTRAIT_MAX_WIDTH, innerY, innerX + PORTRAIT_MAX_WIDTH, innerY + r);
                ctx.lineTo(innerX + PORTRAIT_MAX_WIDTH, innerY + PORTRAIT_MAX_HEIGHT - r);
                ctx.quadraticCurveTo(innerX + PORTRAIT_MAX_WIDTH, innerY + PORTRAIT_MAX_HEIGHT, innerX + PORTRAIT_MAX_WIDTH - r, innerY + PORTRAIT_MAX_HEIGHT);
                ctx.lineTo(innerX + r, innerY + PORTRAIT_MAX_HEIGHT);
                ctx.quadraticCurveTo(innerX, innerY + PORTRAIT_MAX_HEIGHT, innerX, innerY + PORTRAIT_MAX_HEIGHT - r);
                ctx.lineTo(innerX, innerY + r);
                ctx.quadraticCurveTo(innerX, innerY, innerX + r, innerY);
                ctx.closePath();
                ctx.clip();
                if (isDead) {
                    greyscale(ctx, image, innerX, innerY, PORTRAIT_MAX_WIDTH, PORTRAIT_MAX_HEIGHT, offset);
                    
                } else {
                    ctx.drawImage(image, innerX, innerY, PORTRAIT_MAX_WIDTH, PORTRAIT_MAX_HEIGHT);
                }

                ctx.restore();

                drawUnitBadges(ctx, innerX, innerY, PORTRAIT_MAX_WIDTH, PORTRAIT_MAX_HEIGHT, unit, isDead, account, imagesMap, characterMap);

                const nameY =
                    portraitFrameY +
                    PORTRAIT_MAX_HEIGHT +
                    PORTRAIT_PADDING * 2 +
                    NAME_EXTRA_OFFSET;

                ctx.save();
                ctx.textAlign = "center";
                ctx.fillStyle = "#FFFFFF";
                ctx.font = "12px Sans-serif";
                drawTruncatedText(
                    ctx,
                    character.nameKey,
                    portraitFrameX + UNIT_CELL_WIDTH / 2,
                    nameY,
                    UNIT_CELL_WIDTH
                );
                ctx.restore();
            });
        });
    });
}

/* ============================================================
   STATUS BARS
   ============================================================ */

export async function drawSingleUnitTest(unit, imagesMap, account, characterMap) {
  const PORTRAIT_SIZE = 128;
  const canvas = createCanvas(PORTRAIT_SIZE, PORTRAIT_SIZE);
  const ctx = canvas.getContext("2d");

  // Background for visibility
  ctx.fillStyle = "rgba(20,20,20,0.9)";
  ctx.fillRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);

  // --- Draw portrait ---
  const portraitImg = imagesMap[unit.baseId];
  safeDrawImage(ctx, portraitImg, 32, 32, 64, 64);

  // --- Draw badges ---
  drawUnitBadges(
    ctx,
    32,
    32,
    64,
    64,
    unit,
    account,
    imagesMap,
    characterMap
  );

  return canvas.toBuffer("image/png");
}

function drawStatusBars(ctx, x, y, unit) {
    const w = UNIT_CELL_WIDTH;
    const r = 3; // small radius looks best

    ctx.save();

    // Background bars (dark)
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    roundRect(ctx, x, y, w, STATUS_BAR_HEIGHT, r);
    ctx.fill();
    roundRect(ctx, x, y + STATUS_BAR_HEIGHT, w, STATUS_BAR_HEIGHT, r);
    ctx.fill();

    const hp = Number(unit.unitState.healthPercent) / 100;
    const prot = Number(unit.unitState.shieldPercent) / 100;

    // Protection bar (white)
    if (prot > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        roundRect(ctx, x + (1 - prot) * w, y, prot * w, STATUS_BAR_HEIGHT, r);
        ctx.fill();
    }


    // Health bar (green/yellow/red)
    if (hp > 0) {
        ctx.fillStyle = hp >= 0.5 ? "#3ad35c" : hp >= 0.2 ? "#f5d34a" : "#f54242";
        roundRect(ctx, x + (1 - hp) * w, y + STATUS_BAR_HEIGHT, hp * w, STATUS_BAR_HEIGHT, r);
        ctx.fill();
    }

    // Borders
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.75;
    roundRect(ctx, x, y, w, STATUS_BAR_HEIGHT, r);
    ctx.stroke();
    roundRect(ctx, x, y + STATUS_BAR_HEIGHT, w, STATUS_BAR_HEIGHT, r);
    ctx.stroke();

    ctx.restore();
}

function drawUnitBadges(ctx, x, y, w, h, unit, isDefeated, account, imagesMap, characterMap) {
  let baseId = unit.unitDefId.split(':')[0]
  let gameUnit = characterMap[baseId]
  let accountUnit = account.rosterUnit.find(toon => toon.baseId === baseId)
//   console.log(unit, accountUnit, gameUnit)


  let zetaCount = accountUnit.zetaCount
  let omicronCount = accountUnit.omicronCount
  let relicTier = (accountUnit.relic?.currentTier - 2) || 0

    let alignment = gameUnit.forceAlignment
    let isShip = gameUnit.combatType !== 1
    if(isShip) return

    const badgeSize = 35
    const omiSize = 30
    const zetaSize = 25
    const textSize = 20

    // Fixed X positions
    const leftX   = x - 2
    const centerX = x + (w - badgeSize) / 2
    const rightX  = x + (w - omiSize) + 3

    const leftY = y + h - zetaSize/2 + 1
    const centerY = y + h - badgeSize / 2 + 1
    const rightY = y + h - omiSize / 2 + 1
    

    let alignmentBadge = alignment === 1 ? 'relic-neutral' : alignment === 2 ? 'relic-light' : 'relic-dark'
    let hasUltimate = accountUnit.purchasedAbilityId?.length > 0

    let relicBadge = isDefeated ? 'relic-neutral' : hasUltimate ? 'relic-ultimate' : alignmentBadge




  if (zetaCount > 0) {
    ctx.drawImage(imagesMap["zeta"], leftX, leftY, zetaSize, zetaSize)
    drawCenteredBadgeText(ctx, zetaCount, x + 1, y + h - textSize/2, textSize)
  }

  if (omicronCount > 0) {
    ctx.drawImage(imagesMap["omicron"], rightX, rightY, omiSize, omiSize)
    drawCenteredBadgeText(ctx, omicronCount,  x + (w - textSize) - 2, y + h - textSize / 2, textSize)
  }
    if (relicTier > 0) {
    ctx.drawImage(imagesMap[relicBadge], centerX, centerY, badgeSize, badgeSize)
    drawCenteredBadgeText(ctx, relicTier, x + (w - textSize) / 2, y + h - textSize / 2, textSize)
  }

}

function safeDrawImage(ctx, img, x, y, w, h) {
  if (!img) return;                 // null / undefined
  if (!img.complete) return;        // still decoding
  if (img.width === 0 || img.height === 0) return; // decode failed
  ctx.drawImage(img, x, y, w, h);
}

function drawCenteredBadgeText(ctx, text, x, y, size) {
  ctx.save();
  ctx.font = `${Math.floor(size * 0.55)}px Sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

    // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillText(text, x + size / 2, y + size / 2);
  ctx.restore();
}



/* ============================================================
   TEXT TRUNCATION
   ============================================================ */

export function drawTruncatedText(ctx, text, x, y, maxWidth) {
    let t = text || "";
    let w = ctx.measureText(t).width;

    if (w > maxWidth) {
        while (w > maxWidth && t.length > 0) {
            t = t.slice(0, -1);
            w = ctx.measureText(t + "...").width;
        }
        t += "...";
    }

    ctx.fillText(t, x, y);
}

function formatNumberWithCommas(x) {
  if (typeof x !== "number") return "0";
  return x.toLocaleString("en-US");
}



/* ============================================================
   GREYSCALE
   ============================================================ */

export function greyscale(ctx, image, x, y, w, h, offset = 0) {
    ctx.drawImage(image, x, y, w, h);
    const imgData = ctx.getImageData(x+offset, y, w, h);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
        const grey = 0.21 * d[i] + 0.72 * d[i + 1] + 0.07 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = grey;
    }
    ctx.putImageData(imgData, x+offset, y);
}

/* ============================================================
   UI ELEMENTS
   ============================================================ */

function drawGroupBox(ctx, x, y, w, h, { fill, stroke, radius, lineWidth }) {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}


function drawPortraitFrame(ctx, x, y, w, h) {
    ctx.save();
    const r = 10;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    // 🔥 Transparent fill — eliminates gray squares
    ctx.fillStyle = "rgba(255,255,255,0.0)";

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;

    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawSquadHeader(ctx, x, y, w, battles, powerString) {
  ctx.save();

  // Background
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, w, SQUAD_HEADER_HEIGHT);

  ctx.font = "14px Sans-serif";
  ctx.textBaseline = "middle";

  // LEFT SIDE — Power
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";

  const formattedPower = formatNumberWithCommas(powerString);
  ctx.fillText(`Power: ${formattedPower}`, x + SQUAD_PADDING, y + SQUAD_HEADER_HEIGHT / 2);

  // RIGHT SIDE — Attacks
  if (battles > 1) {
    ctx.shadowColor = "rgba(255,215,0,0.75)";
    ctx.shadowBlur = 8;
  }

  ctx.textAlign = "right";
  ctx.fillStyle =
    battles === 0
      ? "rgba(180,180,180,0.9)"
      : battles === 1
      ? "rgba(255,255,255,1.0)"
      : "rgba(255,215,0,1.0)";

  ctx.fillText(`Attacks: ${battles}`, x + w - SQUAD_PADDING, y + SQUAD_HEADER_HEIGHT / 2);

  ctx.restore();
}


function drawFooter(ctx, width, height, logoImage) {
    ctx.save();

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, height - BOARD_FOOTER_HEIGHT, width, BOARD_FOOTER_HEIGHT);

    // Logo (24x24)
    if (logoImage) {
        ctx.drawImage(logoImage, 10, height - BOARD_FOOTER_HEIGHT + 8, 24, 24);
    }

    // Text
    ctx.font = "16px Sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";

    ctx.fillText(
        "Built by Quigbot",
        44,
        height - BOARD_FOOTER_HEIGHT / 2
    );

    // Timestamp
    const ts = new Date().toLocaleString();
    ctx.textAlign = "right";
    ctx.fillText(ts, width - 20, height - BOARD_FOOTER_HEIGHT / 2);

    ctx.restore();
}


/* ============================================================
   BACKGROUND
   ============================================================ */

function drawGradientBackground(ctx, width, height) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#0b1e3a");
    grad.addColorStop(1, "#0a1424");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
}

function drawSideBackground(ctx, x, y, w, h, theme) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);

    if (theme === "home") {
        grad.addColorStop(0, "#0a1a33");
        grad.addColorStop(1, "#0b1e3a");
    } else {
        grad.addColorStop(0, "#2a0f0f");
        grad.addColorStop(1, "#1a0a0a");
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
}

function drawVignette(ctx, width, height) {
    const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width / 4,
        width / 2,
        height / 2,
        width / 1.2
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
}

function drawTitleBar(ctx, width, text, theme) {
    ctx.save();

    const color = theme === "home"
        ? "rgba(60, 110, 200, 0.55)"   // softer blue
        : "rgba(200, 70, 70, 0.55)";   // softer red

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, BOARD_TITLE_HEIGHT);

    ctx.font = "24px Sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 20, BOARD_TITLE_HEIGHT / 2);

    ctx.restore();
}

function drawSectionDivider(ctx, midX, height) {
    ctx.save();
    const grad = ctx.createLinearGradient(midX - 20, 0, midX + 20, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.08)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(midX - 20, 0, 40, height);
    ctx.restore();
}

function drawPlaceholder(message, imagesMap) {
  const width = 600;
  const height = 200;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(30,30,30,0.9)";
  ctx.fillRect(0, 0, width, height);

  // Logo
  const logo = imagesMap["quigbot_logo"];
  if (logo) {
    ctx.drawImage(logo, width/2 - 20, 30, 40, 40);
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "20px Sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, 120);

  const ts = new Date().toLocaleString();
  ctx.font = "14px Sans-serif";
  ctx.fillText(ts, width / 2, 160);

  return canvas.toBuffer("image/png");
}


