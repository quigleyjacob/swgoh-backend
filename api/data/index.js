import express from 'express'
import { getSkills, getData, getPortrait, getPortraits, getCurrency, getMaterial, getEquipment } from './data.js'

let router = express.Router()

router.route('/')
    .post(getData)

router.route('/skill')
    .post(getSkills)

router.route('/portrait')
    .get(getPortraits)
    .post(getPortrait)

router.route('/currency')
    .get(getCurrency)

router.route('/material')
    .get(getMaterial)

router.route('/equipment')
    .get(getEquipment)

export default router