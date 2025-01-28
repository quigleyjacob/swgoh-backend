export const localize = (field) => {
    return [
        {
            "$lookup": {
                from: "Loc_ENG_US",
                localField: field,
                foreignField: "key",
                as: field
            }
        },
        {
            "$unwind": {
                path: `$${field}`
            }
        },
        {
            '$addFields': {
                [field]: `$${field}.value`
            }
        }
    ]
}