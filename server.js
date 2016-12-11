var express = require('express')
var app = express()
var mongodb = require('mongodb')
var validUrl = require('valid-url')
var shortid = require('shortid')
var path = require('path')
require('dotenv').config({silent: true})
var port = process.env.PORT || 8080
var url = process.env.MONGODB_URI || 'mongodb://localhost:27017/url-shortener'
var MongoClient = mongodb.MongoClient
var app_url = process.env.APP_URL || 'http://localhost:' + port

app.use(express.static(path.join(__dirname, './public')))
app.set('views', path.join(__dirname, "./templates"))
app.set('view engine', 'jade')

app.get('/', function (req, res) {
  res.render('index', { title: 'URL Shortener Microservice' })
})

app.get('/new/*', function (req, res) {
  var original_url = req.url.slice(5)
  if (validUrl.isUri(original_url)){
    MongoClient.connect(url, function (err, db) {
      //if (err) throw err
      if (err) {
        //console.log('Unable to connect to the mongoDB server. Error:', err)
        throw err
      } else {
        //console.log('Connection established to', url)    
        var collection = db.collection('urls')
        collection.find({
          original_url: {
            $eq: original_url
          }
        }, {
          original_url: 1
        , shortened_url: 1
        , _id: 0
        }).toArray(function(err, urls) {
          if (err) throw err
          if (urls.length !== 0) {
            urls[0].shortened_url=app_url+urls[0].shortened_url
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(urls[0]))
            db.close()
          } else {
            var doc = {
              original_url: original_url,
              shortened_url: shortid.generate()
            }
            collection.insert(doc, function(err, data) {
              if (err) throw err
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                original_url: doc.original_url,
                shortened_url: app_url+doc.shortened_url
              }))
              db.close()
            })
          }
        })
      }
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({"error":"This original url is not valid."}))
  }
})

app.get('/:id', function (req, res) {
  var shortened_url = req.params.id
  if(shortid.isValid(shortened_url)){
    MongoClient.connect(url, function (err, db) {
      if (err) {
        //console.log('Unable to connect to the mongoDB server. Error:', err)
        throw err
      } else {
        //console.log('Connection established to', url)
        var collection = db.collection('urls')
        collection.find({
          shortened_url: {
            $eq: shortened_url
          }
        }).toArray(function(err, urls) {
          if (err) throw err
          if (urls.length !== 0)
            res.redirect(urls[0].original_url)
          else {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({"error":"This shortened url is not on the database."}))
          }
          db.close()
        })
      }
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({"error":"This shortened url is not valid."}))
  }
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!')
})
