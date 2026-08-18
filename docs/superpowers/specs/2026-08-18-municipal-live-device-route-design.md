# Municipal BFP Live Device Route Design

## Goal

Route Municipal BFP personnel from the current GPS location of the device they are using to the resident's reported fire location.

## Design

- When the incident map opens, request one high-accuracy browser GPS reading from the Municipal BFP device.
- Show the device position as a blue live-origin map marker and use it as the OSRM road-route origin.
- Keep the red emergency pin as the incident destination and show a solid red driving route, distance, and ETA.
- If browser GPS is unavailable, denied, or times out, route from the assigned station and show that fallback in the route message.
- Do not persist the Municipal BFP device position or change report, resident, or database data.

## Verification

- Test for browser geolocation, a live-location marker, and live coordinates sent to the road route API.
- Run the focused map test, full app tests, and production build.
