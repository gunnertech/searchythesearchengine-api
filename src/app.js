import express      from 'express';
import path         from 'path';
import logger       from 'morgan';
import cookieSession from 'cookie-session';
import cookieParser from 'cookie-parser';
import bodyParser   from 'body-parser';
import favicon      from 'serve-favicon';
import morgan       from 'morgan';


import search     from './routes/search';


let app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({ secret: 'secret'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/../public')));
app.use(morgan('dev'));

app.use('/search', search);

app.use(favicon(__dirname + '/../public/images/favicon.ico'));
// using arrow syntax
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json(err);
});



module.exports = app;