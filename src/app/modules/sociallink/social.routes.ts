import { Router } from 'express';
import { getTikTokProfileController, getYoutubeChannelDataController } from './social.controller';



const router = Router();


router.get("/youtube/:username",getYoutubeChannelDataController);

router.get("/tiktok/:username", getTikTokProfileController);


export const sosaleMediaRoutes = router;
