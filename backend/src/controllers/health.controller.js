function getRootHealth(req, res) {
  res.send('Mantion Backend is running');
}

function getApiHealth(req, res) {
  res.json({ status: 'ok' });
}

module.exports = {
  getRootHealth,
  getApiHealth,
};