# Battleship PvP Rules & Mechanics

## Overview
This implementation of Battleship is a peer-to-peer (P2P) multiplayer game. It uses WebRTC to sync game states directly between two browsers without a centralized game server.

## Gameplay Rules
The game follows standard naval combat rules:

1.  **Grid**: 10x10 coordinate system (A-J, 1-10).
2.  **The Fleet**: Each player deploys 5 ships:
    - **Carrier**: 5 cells
    - **Battleship**: 4 cells
    - **Destroyer**: 3 cells
    - **Submarine**: 3 cells
    - **Patrol Boat**: 2 cells
3.  **Setup Phase**:
    - Players place ships horizontally or vertically.
    - Ships cannot overlap or be placed outside the grid.
    - Both players must click "Ready" (automatic once all ships are placed) to begin.
4.  **Battle Phase**:
    - Players take turns selecting a coordinate on the opponent's "Tracking Map".
    - **Hit**: The opponent confirms a ship occupies that cell. Marked in **Red**.
    - **Miss**: No ship occupies that cell. Marked in **Light Blue**.
    - **Sunk**: When all cells of a specific ship are hit, that ship is declared sunk.
5.  **Winning**: The first player to sink all 5 of the opponent's ships wins.

## Networking Protocol (PeerJS)
The game uses a lightweight JSON protocol over the WebRTC Data Channel:

| Type | Data | Description |
| :--- | :--- | :--- |
| `READY` | `{ type: 'READY' }` | Sent when a player finishes setup. |
| `ATTACK` | `{ type: 'ATTACK', x, y }` | Sent when a player fires at a coordinate. |
| `RESULT` | `{ type: 'RESULT', x, y, result, sunkShipType? }` | Response to an attack (`hit`, `miss`, or `sunk`). |
| `GAME_OVER` | `{ type: 'GAME_OVER' }` | Sent when the local player's fleet is entirely destroyed. |

## Technical Notes
- **Hosting**: The player who inputs an ID is the "Host" for turn-order purposes (Host goes first).
- **Security**: Game logic is verified on the *receiving* end (the player being attacked determines if it's a hit/miss) to prevent coordinate leaking via memory inspection of the opponent's grid.
