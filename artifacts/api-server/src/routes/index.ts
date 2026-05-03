import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import adminRouter from "./admin.js";
import tmdbRouter from "./tmdb.js";
import settingsRouter from "./settings.js";
import adsRouter from "./ads.js";
import embedsRouter from "./embeds.js";
import customMoviesRouter from "./custom-movies.js";
import messagesRouter from "./messages.js";
import commentsRouter from "./comments.js";
import syncRouter from "./sync.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(tmdbRouter);
router.use(settingsRouter);
router.use(adsRouter);
router.use(embedsRouter);
router.use(customMoviesRouter);
router.use(messagesRouter);
router.use(commentsRouter);
router.use(syncRouter);

export default router;
