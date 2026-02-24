import { Router } from 'express';
import { getYoutubeChannelDataController } from './social.controller';



const router = Router();


router.get("/youtube/:username",getYoutubeChannelDataController);


export const sosaleMediaRoutes = router;
