function getHello(req, res) {
  res.json({ message: 'Hello from Mantion Backend!' });
}

module.exports = {
  getHello,
};