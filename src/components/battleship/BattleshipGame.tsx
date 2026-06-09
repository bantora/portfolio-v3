import { useState, useEffect } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { useBattleship, SHIP_CONFIG, type ShipType } from './useBattleship';
import { Target, Anchor, Shield, RotateCcw, Play, UserPlus, Zap } from 'lucide-react';

type GameState = 'lobby' | 'setup' | 'waiting' | 'playing' | 'gameover';

export default function BattleshipGame() {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [myId, setMyId] = useState('');
  const [remoteId, setRemoteId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isOpponentReady, setIsOpponentReady] = useState(false);
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  const [showForceStart, setShowForceStart] = useState(false);
  const [rematchStatus, setRematchStatus] = useState<'none' | 'sent' | 'received'>('none');
  
  const [selectedShip, setSelectedShip] = useState<ShipType | null>(null);
  const [isHorizontal, setIsHorizontal] = useState(true);

  const {
    myGrid,
    myShips,
    opponentGrid,
    isMyTurn,
    setIsMyTurn,
    placeShip,
    handleIncomingAttack,
    recordAttackResult,
    reset
  } = useBattleship();

  // Initialize Peer
  useEffect(() => {
    const newPeer = new Peer();
    newPeer.on('open', (id) => {
      console.log('Peer connected with ID:', id);
      setMyId(id);
    });
    newPeer.on('connection', (connection) => {
      console.log('Incoming connection from:', connection.peer);
      if (conn) {
        console.warn('Closing redundant connection');
        connection.close();
        return;
      }
      setConn(connection);
      setIsHost(false);
      setGameState('setup');
    });
    setPeer(newPeer);
    return () => newPeer.destroy();
  }, []);

  // Handle Incoming Data
  useEffect(() => {
    if (!conn) return;

    conn.on('data', (data: any) => {
      console.log('Incoming Data:', data.type, data);
      switch (data.type) {
        case 'READY':
          console.log('Opponent signaled READY');
          setIsOpponentReady(true);
          break;
        case 'ATTACK':
          const attackResult = handleIncomingAttack(data.x, data.y);
          conn.send({ type: 'RESULT', x: data.x, y: data.y, ...attackResult });
          setIsMyTurn(true);
          break;
        case 'RESULT':
          recordAttackResult(data.x, data.y, data.result);
          setIsMyTurn(false);
          break;
        case 'GAME_OVER':
          console.log('Received GAME_OVER signal from opponent');
          setGameState('gameover');
          setWinner('me');
          break;
        case 'FORCE_START':
          console.log('Received FORCE_START signal');
          setGameState('playing');
          setIsMyTurn(isHost);
          break;
        case 'REMATCH_REQUEST':
          setRematchStatus('received');
          break;
        case 'REMATCH_ACCEPT':
          startRematch();
          break;
      }
    });

    conn.on('close', () => {
      console.error('Connection closed by peer');
      alert('Opponent disconnected');
      window.location.reload();
    });
  }, [conn, handleIncomingAttack, recordAttackResult, setIsMyTurn, isHost]);

  const startRematch = () => {
    reset();
    setGameState('setup');
    setIsOpponentReady(false);
    setWinner(null);
    setRematchStatus('none');
    setShowForceStart(false);
  };

  const handleRematchClick = () => {
    if (rematchStatus === 'received') {
      conn?.send({ type: 'REMATCH_ACCEPT' });
      startRematch();
    } else {
      setRematchStatus('sent');
      conn?.send({ type: 'REMATCH_REQUEST' });
    }
  };

  // Handle Game Phase Transitions
  useEffect(() => {
    const allShipsPlaced = myShips.length === Object.keys(SHIP_CONFIG).length;
    if (!allShipsPlaced || !conn) return;

    // 1. If we just finished placement, ALWAYS tell the opponent we are ready
    if (gameState === 'setup') {
      console.log('Local setup complete. Informing opponent.');
      setGameState('waiting');
      conn.send({ type: 'READY' });

      // Start a timer for Force Start if it hangs
      const timer = setTimeout(() => {
        if (gameState !== 'playing') {
          console.warn('Sync taking too long. Enabling Force Start.');
          setShowForceStart(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    // 2. If both are ready, start the game
    if (isOpponentReady && gameState === 'waiting') {
      console.log('Both players ready. Starting Game...');
      setGameState('playing');
      setIsMyTurn(isHost);
    }
  }, [myShips.length, isOpponentReady, isHost, conn, gameState]);

  const forceStartGame = () => {
    console.log('Manual Force Start Triggered');
    setGameState('playing');
    setIsMyTurn(isHost);
    conn?.send({ type: 'FORCE_START' });
  };

  // Check Win Condition
  useEffect(() => {
    const allSunk = myShips.length > 0 && myShips.every(s => s.hits === s.length);
    if (allSunk && gameState === 'playing') {
      setGameState('gameover');
      setWinner('opponent');
      conn?.send({ type: 'GAME_OVER' });
    }
  }, [myShips, gameState, conn]);

  const connectToPeer = () => {
    if (!peer || !remoteId) return;
    const connection = peer.connect(remoteId);
    connection.on('open', () => {
      setConn(connection);
      setIsHost(true);
      setGameState('setup');
    });
  };

  const handleFire = (x: number, y: number) => {
    if (!isMyTurn || opponentGrid[y][x] !== 'empty') return;
    conn?.send({ type: 'ATTACK', x, y });
    setIsMyTurn(false);
  };

  const renderGrid = (grid: any[][], onClick?: (x: number, y: number) => void) => (
    <div className="grid grid-cols-10 gap-1 bg-slate-800 p-2 rounded-lg border-2 border-slate-700 shadow-xl">
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <button
            key={`${x}-${y}`}
            onClick={() => onClick?.(x, y)}
            className={`w-8 h-8 md:w-10 md:h-10 rounded-sm transition-all duration-200 border border-slate-700/50 
              ${cell === 'ship' ? 'bg-slate-400' : ''}
              ${cell === 'hit' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-90' : ''}
              ${cell === 'miss' ? 'bg-blue-300 scale-75 opacity-50' : ''}
              ${cell === 'empty' ? 'hover:bg-slate-600 bg-slate-900' : ''}
            `}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-8 p-4 text-slate-100 min-h-screen bg-slate-950 font-sans">
      <header className="flex flex-col items-center gap-2 mb-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 uppercase italic">
          Battleship <span className="text-red-500">PVP</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-medium">Real-time Peer-to-Peer Naval Combat</p>
      </header>

      {gameState === 'lobby' && (
        <div className="flex flex-col gap-6 w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Connection ID</label>
            <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <code className="text-blue-400 font-mono text-lg flex-1 truncate">{myId || 'Generating...'}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(myId)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                title="Copy ID"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-4 text-slate-500 font-bold tracking-widest">Or</span></div>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Paste Opponent's ID"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              className="p-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
            />
            <button
              onClick={connectToPeer}
              className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
            >
              <Zap size={20} fill="currentColor" /> CONNECT TO FLEET
            </button>
          </div>
        </div>
      )}

      {gameState === 'setup' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Anchor className="text-blue-400" /> DEPLOY YOUR FLEET
            </h2>
            <p className="text-slate-400">Place your ships on the grid. Select a ship and click to deploy.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(SHIP_CONFIG) as ShipType[]).map((type) => (
                  <button
                    key={type}
                    disabled={myShips.some(s => s.type === type)}
                    onClick={() => setSelectedShip(type)}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                      ${selectedShip === type ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900'}
                      ${myShips.some(s => s.type === type) ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:border-slate-600'}
                    `}
                  >
                    <div className="relative z-10">
                      <div className="text-xs font-black uppercase tracking-tighter mb-1 text-slate-500 group-hover:text-slate-400">{type}</div>
                      <div className="flex gap-1">
                        {Array(SHIP_CONFIG[type]).fill(0).map((_, i) => (
                          <div key={i} className={`w-2 h-4 rounded-sm ${selectedShip === type ? 'bg-blue-500' : 'bg-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsHorizontal(!isHorizontal)}
                className="flex items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all border border-slate-700"
              >
                <RotateCcw size={18} className={isHorizontal ? '' : 'rotate-90'} /> 
                ROTATION: {isHorizontal ? 'HORIZONTAL' : 'VERTICAL'}
              </button>
            </div>
            {renderGrid(myGrid, (x, y) => selectedShip && placeShip(selectedShip, x, y, isHorizontal))}
          </div>
        </div>
      )}

      {gameState === 'waiting' && (
        <div className="flex flex-col items-center gap-6 p-12 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl animate-pulse">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500/50">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Fleet Ready</h2>
            <p className="text-slate-500">Waiting for opponent to finish deployment...</p>
          </div>
          {showForceStart && (
            <button
              onClick={forceStartGame}
              className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all animate-none"
            >
              FORCE START GAME
            </button>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-12 w-full max-w-6xl">
          <div className={`px-8 py-3 rounded-full font-black text-lg tracking-widest border-2 transition-all
            ${isMyTurn ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400'}
          `}>
            {isMyTurn ? 'YOUR TURN - FIRE AT WILL!' : 'OPPONENT THINKING...'}
          </div>

          <div className="flex flex-col lg:flex-row gap-12 xl:gap-24">
            <div className="flex flex-col items-center gap-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <Target size={16} /> Enemy Tracking Map
               </h3>
               {renderGrid(opponentGrid, handleFire)}
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Shield size={16} /> Your Fleet Status
              </h3>
              {renderGrid(myGrid)}
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="flex flex-col items-center gap-8 p-12 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl">
          <div className={`text-6xl font-black italic uppercase tracking-tighter
            ${winner === 'me' ? 'text-blue-500' : 'text-red-500'}
          `}>
            {winner === 'me' ? 'Victory' : 'Defeated'}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleRematchClick}
              disabled={rematchStatus === 'sent'}
              className={`flex items-center gap-2 px-8 py-4 font-black rounded-xl transition-all
                ${rematchStatus === 'received' ? 'bg-blue-600 text-white hover:bg-blue-500 animate-pulse' : 
                  rematchStatus === 'sent' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 
                  'bg-white text-slate-950 hover:bg-slate-200'}
              `}
            >
              <RotateCcw size={20} /> 
              {rematchStatus === 'received' ? 'ACCEPT REMATCH' : 
               rematchStatus === 'sent' ? 'WAITING FOR OPPONENT...' : 
               'REQUEST REMATCH'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700 transition-all"
            >
              <Play size={20} fill="currentColor" /> RETURN TO LOBBY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
