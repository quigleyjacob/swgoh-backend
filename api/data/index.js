import express from 'express'
import { getSkills, getData, getPortrait, getCurrency, getMaterial, getEquipment, getPlayerScores, getUnits, getCategory } from './data.js'

let router = express.Router()

router.route('/skill')
    .get(getSkills)

router.route('/portrait/:id')
    .get(getPortrait)

router.route('/currency')
    .get(getCurrency)

router.route('/material')
    .get(getMaterial)

router.route('/equipment')
    .get(getEquipment)

router.route('/unit')
    .get(getUnits)

router.route('/category')
    .get(getCategory)

router.route('/playerScores')
    .post(getPlayerScores)

router.route('/:type')
    .get(getData)

export default router