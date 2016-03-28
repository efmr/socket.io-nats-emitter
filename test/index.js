var expect = require('expect.js');
var io = require('socket.io');
var ioc = require('socket.io-client');
var natsAdapter = require('socket.io-nats');
var http = require('http').Server;
var ioe = require('../');

function client(srv, namespace, options) {
  var addr;
  var url;
  var nsp = namespace;
  var opts = options;
  if (typeof nsp === 'object') {
    opts = nsp;
    nsp = null;
  }
  addr = srv.address();
  if (!addr) addr = srv.listen().address();
  url = 'http://localhost:' + addr.port + (nsp || '');
  return ioc(url, opts);
}

describe('emitter', function describeEmitter() {
  describe('in namespaces', function inNsp() {
    var srv;
    beforeEach(function before() {
      var sio;
      srv = http();
      sio = io(srv, { adapter: natsAdapter() });

      srv.listen(function listen() {
        ['/', '/nsp'].forEach(function namespace(nsp) {
          sio.of(nsp).on('connection', function onConn(socket) {
            socket.on('broadcast event', function event(payload) {
              socket.emit('broadcast event', payload);
            });
          });
        });
      });
    });

    it('should be able to emit messages to client', function emit(done) {
      var emitter = ioe();
      var cli = client(srv, { forceNew: true });
      cli.on('connect', function onConn() {
        emitter.emit('broadcast event', 'broadcast payload');
      });

      cli.on('broadcast event', function onEvent() {
        cli.close();
        done();
      });
    });

    it('should be able to emit message to namespace', function emit(done) {
      var cli = client(srv, '/nsp', { forceNew: true });
      cli.on('broadcast event', function onEvent() {
        cli.close();
        done();
      });

      cli.on('connect', function onConn() {
        var emitter = ioe();
        emitter.of('/nsp').broadcast.emit('broadcast event',
          'broadcast payload');
      });
    });

    it('should not emit message to all namespaces', function emit(done) {
      var a = client(srv, '/nsp', { forceNew: true });
      var b;

      a.on('connect', function aConn() {
        b = client(srv, { forceNew: true });
        b.on('broadcast event', function event() {
          expect().fail();
        });

        b.on('connect', function bConn() {
          var emitter = ioe();
          emitter.of('/nsp').broadcast.emit(
            'broadcast event', 'broadcast payload');
        });
      });

      a.on('broadcast event', function event() {
        setTimeout(done, 500);
      });
    });
  });

  describe('in rooms', function inRooms() {
    it('should be able to emit to a room', function emitRoom(done) {
      var sio;
      var a;
      var b;
      var secondConnecting = false;
      var emitter = ioe();
      var srv = http();
      sio = io(srv, { adapter: natsAdapter() });

      srv.listen(function listen() {
        sio.on('connection', function conn(socket) {
          if (secondConnecting) {
            socket.join('exclusive room');
          } else {
            secondConnecting = true;
          }

          socket.on('broadcast event', function event(payload) {
            socket.emit('broadcast event', payload);
          });
        });
      });

      a = client(srv, { forceNew: true });
      a.on('broadcast event', function event() {
        expect().fail();
      });

      a.on('connect', function conn() {
        b = client(srv, { forceNew: true });

        b.on('broadcast event', function event(payload) {
          expect(payload).to.be('broadcast payload');
          setTimeout(done, 500);
        });

        b.on('connect', function bConn() {
          setTimeout(function delay() {
            emitter.to('exclusive room').broadcast.emit(
              'broadcast event', 'broadcast payload');
          }, 50);
        });
      });
    });

    it('should be able to emit to a socket by id', function emit(done) {
      var sio;
      var secondConnecting = false;
      var secondId;
      var a;
      var b;
      var emitter = ioe();
      var srv = http();
      sio = io(srv, { adapter: natsAdapter() });

      srv.listen(function listen() {
        sio.on('connection', function conn(socket) {
          if (secondConnecting) {
            secondId = socket.id;
          } else {
            secondConnecting = true;
          }

          socket.on('broadcast event', function event(payload) {
            socket.emit('broadcast event', payload);
          });
        });
      });

      a = client(srv, { forceNew: true });
      a.on('broadcast event', function event() {
        expect().fail();
      });

      a.on('connect', function conn() {
        b = client(srv, { forceNew: true });

        b.on('broadcast event', function event(payload) {
          expect(payload).to.be('broadcast payload');
          setTimeout(done, 500);
        });

        b.on('connect', function bConn() {
          setTimeout(function delay() {
            emitter.to(secondId).broadcast.emit(
            'broadcast event', 'broadcast payload');
          }, 50);
        });
      });
    });
  });
});
