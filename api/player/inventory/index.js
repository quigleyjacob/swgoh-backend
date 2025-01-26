import express from 'express'
import { getInventory } from './inventory.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getInventory)

export default router