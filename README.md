
# socket.io-nats-emitter


`socket.io-nats-emitter` allows you to communicate with socket.io servers through
 [NATS](http://nats.io/) easily from non-socket.io processes, based on the [socket.io-emitter](https://github.com/socketio/socket.io-emitter).

 The socket.io servers instances should use this adapter [socket.io-nats](https://github.com/efmr/socket.io-nats) or one that
 implements the protocol.

## Install

```
npm install socket.io-nats-emitter
```

## How to use

```js
var io = require('socket.io-nats-emitter')();
setInterval(function(){
  io.emit('time', new Date);
}, 5000);
```

## API

### Emitter(opts)

The following options are allowed:

- `key`: the name of the key to pub/sub events on as prefix (`socket.io`)
- `delimiter`: optional, channels delimiter
- `uid`: optional, emitter identifier (`emitter`)
- `nc`: optional, the nats client
- `...`: [nats client options](https://github.com/nats-io/node-nats) (ignored if nats client is supplied)

### Emitter#to(room:String):Emitter
### Emitter#in(room:String):Emitter

Specifies a specific `room` that you want to emit to.

### Emitter#of(namespace:String):Emitter

Specifies a specific namespace that you want to emit to.
