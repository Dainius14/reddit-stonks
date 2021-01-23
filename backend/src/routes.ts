import {DataController} from './controllers/data.controller';
import {StocksController} from './controllers/stocks.controller';
import KoaRouter from '@koa/router';

const dataControleer = new DataController();
const stocksController = new StocksController();

const router = new KoaRouter();
router.prefix('/api/');

router.get('/', (ctx) => ctx.body = {hello: 'world'});
router.get('/stocks/:ticker', async (ctx) => await stocksController.getInfo(ctx));
router.get('/stocks/:ticker/news', async (ctx) => await stocksController.getNews(ctx));
router.get('/data', async (ctx) => await dataControleer.getData(ctx));
router.get('/data/subreddits', async (ctx) => await dataControleer.getAvailableSubreddits(ctx));
router.get('/data/submissions', async (ctx) => await dataControleer.getSubmissions(ctx));


export {router};
