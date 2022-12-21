const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const bodyParser = require('body-parser');
app.use("/", bodyParser.urlencoded({ extended: false }))

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => {
  console.log("MongoDB database connection established successfully")
})

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  userid: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const userSchema = new Schema({
  username: { type: String, required: true },
});

var User = mongoose.model('User', userSchema);
var Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", (req, res) => {
  let inputName = req.body.username;
  User.findOne({ username: inputName }, (error, result) => {
    if (error) {
      console.error(error);
    }
    if (result) {
      res.json({ username: result.username, _id: result._id })
    } else {
      let newUser = new User({ username: inputName });
      newUser.save((error, result) => {
        if (error) console.error(error);
        res.json({ username: result.username, _id: result._id });
      })
    }
  })
})

app.get("/api/users", (req, res) => {
  User.find({}, { username: 1, _id: 1 }, (error, result) => {
    if (error) console.error(error);
    res.json(result);
  })
})

app.post("/api/users/:id/exercises", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.end("not found");
    }

    const exercise = new Exercise({
      userid: req.params.id,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date
        ? new Date(req.body.date).toDateString()
        : new Date().toDateString(),
    });

    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: req.params.id,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/api/users/:id/logs", async (req, res) => {
  const user = await User.findById(req.params.id);
  const limit = Number(req.query.limit) || 0;
  const from = req.query.from ? new Date(req.query.from).toDateString() : new Date(0).toDateString();
  const to = req.query.to ? new Date(req.query.to).toDateString() : new Date().toDateString()

  const exercise = await Exercise.find({
    userid: req.params.id,
    date: { $gte: from, $lte: to }
  })
    .select("-_id -userid -__v")
    .limit(limit)

  let userExercise = exercise.map((each) => {
    return {
      description: each.description,
      duration: each.duration,
      date: each.date.toDateString()
    };
  });

  res.json({
    _id: req.params.id,
    username: user.username,
    count: userExercise.length,
    log: userExercise,
  });

});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})