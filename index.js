require('dotenv').config();

const express = require('express');
const expressLayout = require('express-ejs-layouts');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const flash = require('express-flash');
const bodyParser = require('body-parser');
const multer  = require('multer');
const favicon = require('serve-favicon');
const path = require('path');

const connectDB = require('./server/config/db');
const session = require('express-session');
const { isActiveRoute } = require('./server/helpers/routeHelpers');

const app = express();
const PORT = 5050 || process.env.PORT;

//connect to DB
connectDB();

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(session({
    secret: 'keyboardcat',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
}));

app.use(express.static('public'));
app.use(flash());

//TEMPLATING ENGINE
app.use(expressLayout);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

app.locals.isActiveRoute = isActiveRoute;

app.use('/', require('./server/routes/main'));
app.use('/', require('./server/routes/admin'));


app.listen(PORT, ()=> {
    console.log(`App listening on port ${PORT}`);
});
