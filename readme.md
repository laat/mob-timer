# Custom mob-timer

[mob](https://github.com/remotemobprogramming/mob) 2.0.0 or above required.

An alternative implementation of [timer.mob.sh](https://github.com/remotemobprogramming/timer)

## TODO

- [ ] add WebRTC screen sharing

## Development

```
mkcert localhost
npm ci
npm start
```

## HTTP communication with cli

- HTTPS optional (useful for local development)
- HTTP 1.x required for cli integration
- The response body is printed in the console

```sh
# use another server
export MOB_TIMER_URL=http://localhost:3000/

# enables http timer, and posts to this room
export MOB_TIMER_ROOM=test-room
```

### Adding a timer:

timer is in minutes

```sh
mob timer 10
```

```http
PUT /test-room
Content-Type: application/json

{"timer":10,"user":"Sigurd Fosseng"}
```

### Adding a break timer:

```sh
mob break 2
```

breakTimer is in minutes

```http
PUT /test-room
Content-Type: application/json

{"breaktimer":2,"user":"Sigurd Fosseng"}
```
