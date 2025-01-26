import express from 'express'
import { getActiveBuilds, registerServer, unregisterServer } from './server.js'

let router = express.Router({mergeParams: true})

router.route('/build')
    .get(getActiveBuilds)

router.route('/build/:build')
    .post(registerServer)
    .delete(unregisterServer)

export default router