
/**
 * Module dependencies.
 */

var nats = require('nats');
var parser = require('socket.io-parser');
var hasBin = require('has-binary');
var debug = require('debug')('socket.io-nats-emitter');

/**
 * Flags.
 *
 * @api public
 */
var flags = [
  'json',
  'volatile',
  'broadcast'
];

/**
 * Socket.IO nats based emitter.
 * @constructor
 * @param {Object} emitterOptions - options
 * @api public
 */
function Emitter(emitterOptions) {
  var opts = emitterOptions || {};
  if (!(this instanceof Emitter)) return new Emitter(opts);

  this.nc = opts.nc || nats.connect(opts);
  this.uid = opts.uid || 'emitter';
  this.prefix = opts.key || 'socket.io';
  this.delimiter = opts.delimiter || '.';
  this._rooms = [];
  this._flags = {};
}

/**
 * Apply flags from `Socket`.
 */
flags.forEach(function apply(flag) {
  Emitter.prototype.__defineGetter__(flag, function getter() {
    debug('flag %s on', flag);
    this._flags[flag] = true;
    return this;
  });
});

/**
 * @param  {string} [nsp] - namespace
 * @param  {string} [room] - channel room
 * @return {string} channel name
 */
Emitter.prototype.channelName = function channelName(nsp, room) {
  return room ?
    [this.prefix, nsp || '/', encodeURI(room)].join(this.delimiter) :
    [this.prefix, nsp || '/'].join(this.delimiter);
};

/**
 * Limit emission to a certain `room`.
 *
 * @param {String} room - room to emit
 * @return {Emitter} emitter
 */
Emitter.prototype.in =
Emitter.prototype.to = function to(room) {
  if (!~this._rooms.indexOf(room)) {
    debug('room %s', room);
    this._rooms.push(room);
  }
  return this;
};

/**
 * Limit emission to certain `namespace`.
 *
 * @param {String} nsp - namespace
 * @return {Emitter} emitter
 */
Emitter.prototype.of = function of(nsp) {
  debug('nsp set to %s', nsp);
  this._flags.nsp = nsp;
  return this;
};

/**
 * Send the packet.
 * @return {Emitter} emitter
 * @api public
 */
Emitter.prototype.emit = function emit() {
  // packet
  var args = Array.prototype.slice.call(arguments);
  var packet = {};
  var opts;
  var msg;
  var chn;
  packet.type = hasBin(args) ? parser.BINARY_EVENT : parser.EVENT;
  packet.data = args;
  // set namespace to packet
  if (this._flags.nsp) {
    packet.nsp = this._flags.nsp;
    delete this._flags.nsp;
  } else {
    packet.nsp = '/';
  }

  opts = {
    rooms: this._rooms,
    flags: this._flags
  };

  msg = JSON.stringify([this.uid, packet, opts]);

  // publish
  if (opts.rooms && opts.rooms.length === 1) {
    chn = this.channelName(packet.nsp, opts.rooms[0]);
  } else {
    chn = this.channelName(packet.nsp);
  }

  this.nc.publish(chn, msg);

  // reset state
  this._rooms = [];
  this._flags = {};

  return this;
};


/**
 * Module exports.
 */
module.exports = Emitter;
