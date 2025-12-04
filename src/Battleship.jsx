/**
 * Eternal Battleship - On-Chain Naval Warfare with Commit-Reveal
 *
 * A strategic battleship game with hidden information handled via
 * cryptographic commit-reveal mechanics on the blockchain.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Grid, Swords, Clock, Shield, Lock, Eye, ExternalLink,
  Trophy, Play, Users, Zap, Target, CheckCircle, Info, AlertCircle,
  ChevronDown, ChevronUp, ArrowLeft, Anchor, Ship, Crosshair, RotateCw
} from 'lucide-react';
import { ethers } from 'ethers';
import BATTLESHIP_ABI from './EBSABI.json';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
const EXPECTED_CHAIN_ID = 412346;

// Ship definitions
const SHIP_TYPES = {
  carrier:    { id: 'carrier',    size: 5, name: 'Carrier',    color: 'bg-red-500',    hoverColor: 'hover:bg-red-400' },
  battleship: { id: 'battleship', size: 4, name: 'Battleship', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-400' },
  cruiser:    { id: 'cruiser',    size: 3, name: 'Cruiser',    color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-400' },
  submarine:  { id: 'submarine',  size: 2, name: 'Submarine',  color: 'bg-green-500',  hoverColor: 'hover:bg-green-400' },
  destroyer:  { id: 'destroyer',  size: 2, name: 'Destroyer',  color: 'bg-blue-500',   hoverColor: 'hover:bg-blue-400' },
};

// Total ship cells: 5 + 4 + 3 + 2 + 2 = 16 (but contract uses 17 for encoding)
const TOTAL_SHIP_CELLS = 17;

// Cell states from contract
const CellState = {
  Empty: 0,
  Ship: 1,
  Hit: 2,
  Miss: 3,
  Unknown: 4
};

// Match phases
const MatchPhase = {
  Setup: 0,
  Combat: 1,
  Completed: 2
};

// Theme configurations
const THEMES = {
  dream: {
    name: 'dream',
    primary: '#06b6d4',
    secondary: '#a855f7',
    particles: ['🚢', '⚓', '🌊', '💎'],
    boardBg: 'from-blue-900/50 to-cyan-900/50',
    shipColor: 'bg-cyan-500',
    hitColor: 'bg-red-500',
    missColor: 'bg-blue-300/30'
  },
  daring: {
    name: 'daring',
    primary: '#f97316',
    secondary: '#ef4444',
    particles: ['🚢', '⚓', '🔥', '💥'],
    boardBg: 'from-orange-900/50 to-red-900/50',
    shipColor: 'bg-orange-500',
    hitColor: 'bg-red-600',
    missColor: 'bg-yellow-300/30'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const shortenAddress = (addr) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const formatTime = (seconds) => {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const cellToCoord = (index) => {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const rowLabel = String.fromCharCode(65 + row); // A-J
  return `${rowLabel}${col + 1}`;
};

const coordToCell = (coord) => {
  const row = coord.charCodeAt(0) - 65;
  const col = parseInt(coord.slice(1)) - 1;
  return row * 10 + col;
};

// Calculate ship cells from starting position
const calculateShipCells = (startCell, size, orientation) => {
  const cells = [];
  const row = Math.floor(startCell / 10);
  const col = startCell % 10;

  for (let i = 0; i < size; i++) {
    if (orientation === 'h') {
      if (col + i >= 10) return []; // Out of bounds
      cells.push(startCell + i);
    } else {
      if (row + i >= 10) return []; // Out of bounds
      cells.push(startCell + (i * 10));
    }
  }
  return cells;
};

// Validate ship placement
const validatePlacement = (cells, existingPlacements, currentShipId) => {
  if (cells.length === 0) return false;

  // Check for overlaps with other ships
  for (const [shipId, placement] of Object.entries(existingPlacements)) {
    if (shipId === currentShipId) continue;
    for (const cell of cells) {
      if (placement.cells.includes(cell)) return false;
    }
  }
  return true;
};

// Convert placed ships to uint8[17] array for contract
const convertPlacementToPositions = (placedShips) => {
  const positions = [];
  const shipOrder = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];

  for (const shipId of shipOrder) {
    const ship = placedShips[shipId];
    if (ship) {
      // Add start cell and orientation flag
      const startCell = Math.min(...ship.cells);
      positions.push(startCell);
      positions.push(ship.orientation === 'h' ? 0 : 1);
    }
  }

  // The contract expects all ship cell positions
  // Let's flatten all cells instead
  const allCells = [];
  for (const shipId of shipOrder) {
    const ship = placedShips[shipId];
    if (ship) {
      allCells.push(...ship.cells);
    }
  }

  // Pad or truncate to 17 elements
  while (allCells.length < 17) {
    allCells.push(255); // NO_CELL sentinel
  }

  return allCells.slice(0, 17);
};

// Parse contract errors
const parseContractError = (error) => {
  const message = error.message || '';

  // Battleship-specific errors
  if (message.includes('InvalidShipPlacement')) return 'Invalid ship placement - ships overlap or are out of bounds';
  if (message.includes('InvalidCommitment')) return 'Board reveal does not match your commitment';
  if (message.includes('AlreadyCommitted')) return 'You have already committed your board';
  if (message.includes('AlreadyRevealed')) return 'You have already revealed your board';
  if (message.includes('OpponentNotCommitted')) return 'Wait for opponent to commit their board';
  if (message.includes('NotYourTurn')) return "It's not your turn";
  if (message.includes('InvalidCell')) return 'Invalid target cell (must be 0-99)';
  if (message.includes('CellAlreadyTargeted')) return 'You already fired at this cell';
  if (message.includes('MatchNotActive')) return 'Match is not in active combat phase';
  if (message.includes('AllShipsSunk')) return 'Game over - all ships have been sunk';

  // Generic tournament errors
  if (message.includes('TournamentFull')) return 'Tournament is full';
  if (message.includes('AlreadyEnrolled')) return 'You are already enrolled in this tournament';
  if (message.includes('InsufficientFee')) return 'Insufficient entry fee';
  if (message.includes('TimeoutNotReached')) return 'Timeout period has not been reached yet';

  // Wallet errors
  if (message.includes('user rejected')) return 'Transaction rejected by user';

  return message;
};

// LocalStorage helpers for commit data persistence
// Note: Signature is at TOURNAMENT level, so key is based on tierId + instanceId only
const STORAGE_KEY_PREFIX = 'battleship_tournament_';

const saveCommitData = (tierId, instanceId, data) => {
  const key = `${STORAGE_KEY_PREFIX}${tierId}_${instanceId}`;
  localStorage.setItem(key, JSON.stringify({
    ...data,
    timestamp: Date.now()
  }));
};

const loadCommitData = (tierId, instanceId) => {
  const key = `${STORAGE_KEY_PREFIX}${tierId}_${instanceId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const clearCommitData = (tierId, instanceId) => {
  const key = `${STORAGE_KEY_PREFIX}${tierId}_${instanceId}`;
  localStorage.removeItem(key);
};

// ============================================================================
// PARTICLE BACKGROUND COMPONENT
// ============================================================================

const ParticleBackground = ({ colors, symbols }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particles = useMemo(() => {
    const particleCount = isMobile ? 20 : 40;
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 20 + Math.random() * 20,
      colorIndex: Math.floor(Math.random() * colors.length),
      symbolIndex: Math.floor(Math.random() * symbols.length)
    }));
  }, [isMobile, colors.length, symbols.length]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            transform: 'translateY(100vh)',
            animation: `particle-float ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            willChange: 'transform, opacity',
            color: colors[p.colorIndex],
            fontWeight: 'bold',
            textShadow: `0 0 8px ${colors[p.colorIndex]}`,
            fontSize: '1.5rem'
          }}
        >
          {symbols[p.symbolIndex]}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

// Glass panel wrapper
const GlassPanel = ({ children, className = '' }) => (
  <div
    className={`bg-white/5 backdrop-blur-lg border border-cyan-500/30 rounded-2xl p-6 shadow-lg ${className}`}
  >
    {children}
  </div>
);

// Board cell component
const BoardCell = ({
  index,
  state,
  isYourBoard,
  isSelected,
  isPreview,
  previewValid,
  shipColor,
  onClick,
  onDragOver,
  onDrop,
  disabled,
  theme
}) => {
  const getCellStyle = () => {
    if (isPreview) {
      return previewValid
        ? 'bg-green-500/50 border-green-400'
        : 'bg-red-500/50 border-red-400';
    }

    switch (state) {
      case CellState.Empty:
        return isYourBoard
          ? 'bg-blue-900/30 border-blue-700/50'
          : 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 cursor-crosshair';
      case CellState.Ship:
        return shipColor || 'bg-slate-500/80 border-slate-400';
      case CellState.Hit:
        return 'bg-red-600/80 border-red-500';
      case CellState.Miss:
        return 'bg-blue-400/30 border-blue-300/50';
      case CellState.Unknown:
        return 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 cursor-crosshair';
      default:
        return 'bg-slate-800/50';
    }
  };

  const getCellContent = () => {
    switch (state) {
      case CellState.Hit: return '💥';
      case CellState.Miss: return '○';
      case CellState.Ship: return isYourBoard ? '▪' : '';
      default: return '';
    }
  };

  return (
    <div
      className={`w-7 h-7 md:w-9 md:h-9 border flex items-center justify-center text-sm font-bold transition-all duration-150 ${getCellStyle()} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900' : ''}`}
      onClick={() => !disabled && onClick?.(index)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver?.(e, index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop?.(e, index);
      }}
    >
      {getCellContent()}
    </div>
  );
};

// 10x10 Board grid
const BoardGrid = ({
  board,
  isYourBoard,
  placedShips = {},
  previewCells = [],
  previewValid = false,
  selectedCell,
  onCellClick,
  onDragOver,
  onDragLeave,
  onDrop,
  disabled,
  theme,
  title
}) => {
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  // Build a map of ship cells to ship colors
  const shipCellColors = {};
  Object.entries(placedShips).forEach(([shipId, placement]) => {
    const shipType = SHIP_TYPES[shipId];
    placement.cells.forEach(cell => {
      shipCellColors[cell] = shipType.color;
    });
  });

  return (
    <div
      className="inline-block"
      onDragLeave={(e) => {
        // Only trigger if leaving the board entirely (not just between cells)
        if (!e.currentTarget.contains(e.relatedTarget)) {
          onDragLeave?.();
        }
      }}
    >
      {title && (
        <h3 className={`text-center font-bold mb-2 ${isYourBoard ? 'text-cyan-300' : 'text-red-300'}`}>
          {title}
        </h3>
      )}
      {/* Column headers */}
      <div className="flex">
        <div className="w-7 h-7 md:w-9 md:h-9" /> {/* Corner spacer */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center text-slate-400 text-xs font-mono">
            {i + 1}
          </div>
        ))}
      </div>
      {/* Board rows */}
      {[...Array(10)].map((_, row) => (
        <div key={row} className="flex">
          {/* Row label */}
          <div className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center text-slate-400 text-xs font-mono">
            {rowLabels[row]}
          </div>
          {/* Cells */}
          {[...Array(10)].map((_, col) => {
            const index = row * 10 + col;
            const isPreview = previewCells.includes(index);
            const shipColor = shipCellColors[index];

            // Determine cell state
            let cellState = board[index];
            if (isYourBoard && shipColor && cellState === CellState.Empty) {
              cellState = CellState.Ship;
            }

            return (
              <BoardCell
                key={index}
                index={index}
                state={cellState}
                isYourBoard={isYourBoard}
                isSelected={selectedCell === index}
                isPreview={isPreview}
                previewValid={previewValid}
                shipColor={shipColor}
                onClick={onCellClick}
                onDragOver={onDragOver}
                onDrop={onDrop}
                disabled={disabled}
                theme={theme}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Draggable ship component
const DraggableShip = ({ ship, orientation, onDragStart, onDragEnd, onRotate, isPlaced }) => {
  const handleDragStart = (e) => {
    // Required for Firefox and some browsers
    e.dataTransfer.setData('text/plain', ship.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(ship, orientation);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  if (isPlaced) return null;

  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`flex ${orientation === 'h' ? 'flex-row' : 'flex-col'} cursor-grab active:cursor-grabbing`}
      >
        {[...Array(ship.size)].map((_, i) => (
          <div
            key={i}
            className={`w-7 h-7 ${ship.color} border border-white/30 ${i === 0 ? 'rounded-l' : ''} ${i === ship.size - 1 ? 'rounded-r' : ''}`}
          />
        ))}
      </div>
      <button
        onClick={() => onRotate(ship.id)}
        className="p-1 text-slate-400 hover:text-white transition-colors"
        title="Rotate ship"
      >
        <RotateCw size={16} />
      </button>
      <span className="text-slate-300 text-sm">{ship.name}</span>
    </div>
  );
};

// Ship dock - source of draggable ships
const ShipDock = ({ placedShips, shipOrientations, onDragStart, onDragEnd, onRotate }) => {
  return (
    <GlassPanel className="w-full max-w-xs">
      <h3 className="text-cyan-300 font-bold mb-4 flex items-center gap-2">
        <Anchor size={20} />
        Ship Dock
      </h3>
      <div className="space-y-2">
        {Object.values(SHIP_TYPES).map(ship => (
          <DraggableShip
            key={ship.id}
            ship={ship}
            orientation={shipOrientations[ship.id] || 'h'}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onRotate={onRotate}
            isPlaced={!!placedShips[ship.id]}
          />
        ))}
      </div>
      <p className="text-slate-400 text-xs mt-4">
        Drag ships to board. Click rotate button to change orientation.
      </p>
    </GlassPanel>
  );
};

// Commit/Reveal status display
const CommitRevealStatus = ({ match, account, theme }) => {
  if (!match) return null;

  const isPlayer1 = match.player1?.toLowerCase() === account?.toLowerCase();
  const myCommitted = isPlayer1 ? match.player1Committed : match.player2Committed;
  const opponentCommitted = isPlayer1 ? match.player2Committed : match.player1Committed;
  const myRevealed = isPlayer1 ? match.player1Revealed : match.player2Revealed;
  const opponentRevealed = isPlayer1 ? match.player2Revealed : match.player1Revealed;

  return (
    <GlassPanel className="mb-4">
      <h4 className="text-cyan-300 font-bold mb-3 flex items-center gap-2">
        <Lock size={18} />
        Board Status
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400 text-sm mb-1">Your Board</p>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${myCommitted ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-white text-sm">{myCommitted ? 'Committed' : 'Not Committed'}</span>
          </div>
          {myCommitted && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${myRevealed ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-white text-sm">{myRevealed ? 'Revealed' : 'Not Revealed'}</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-1">Opponent Board</p>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${opponentCommitted ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-white text-sm">{opponentCommitted ? 'Committed' : 'Waiting...'}</span>
          </div>
          {opponentCommitted && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${opponentRevealed ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-white text-sm">{opponentRevealed ? 'Revealed' : 'Waiting...'}</span>
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
};

// Turn indicator
const TurnIndicator = ({ isYourTurn, currentTurn, account }) => (
  <div className={`text-center py-4 px-6 rounded-xl font-bold ${
    isYourTurn
      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
      : 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
  }`}>
    {isYourTurn ? (
      <div className="flex items-center justify-center gap-2">
        <Crosshair className="animate-pulse" size={20} />
        Your Turn - Fire!
      </div>
    ) : (
      <div className="flex items-center justify-center gap-2">
        <Clock size={20} />
        Waiting for opponent...
      </div>
    )}
  </div>
);

// Ships remaining display
const ShipsRemaining = ({ remaining, total, label }) => (
  <div className="text-center">
    <p className="text-slate-400 text-sm mb-1">{label}</p>
    <div className="flex items-center justify-center gap-1">
      {[...Array(total)].map((_, i) => (
        <div
          key={i}
          className={`w-2 h-4 rounded-sm ${i < remaining ? 'bg-cyan-500' : 'bg-red-500/50'}`}
        />
      ))}
    </div>
    <p className="text-white text-sm mt-1">{remaining} / {total}</p>
  </div>
);

// Tournament card component
const TournamentCard = ({
  tournament,
  account,
  onEnroll,
  onViewBracket,
  loading,
  theme
}) => {
  const { tierId, instanceId, status, enrolledCount, maxPlayers, prizePool, entryFee, isEnrolled } = tournament;

  const statusLabels = {
    0: 'Enrolling',
    1: 'In Progress',
    2: 'Completed'
  };

  const canEnroll = status === 0 && !isEnrolled && account;
  const spotsLeft = maxPlayers - enrolledCount;

  return (
    <GlassPanel className="hover:border-cyan-400/50 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">
            Tier {tierId} - Instance {instanceId}
          </h3>
          <p className="text-slate-400 text-sm">
            {maxPlayers} Players • Entry: {entryFee} ETH
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          status === 0 ? 'bg-green-500/20 text-green-400' :
          status === 1 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-slate-500/20 text-slate-400'
        }`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-400 text-sm">Prize Pool</p>
          <p className="text-cyan-400 font-bold">{prizePool} ETH</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Spots Left</p>
          <p className="text-white font-bold">{spotsLeft} / {maxPlayers}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${(enrolledCount / maxPlayers) * 100}%` }}
        />
      </div>

      <div className="flex gap-2">
        {canEnroll && (
          <button
            onClick={() => onEnroll(tierId, instanceId, entryFee)}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Enrolling...' : `Enroll (${entryFee} ETH)`}
          </button>
        )}
        {isEnrolled && status === 0 && (
          <span className="flex-1 text-center py-2 text-yellow-400 font-bold">
            Enrolled - Waiting for players...
          </span>
        )}
        {isEnrolled && status >= 1 && (
          <button
            onClick={() => onViewBracket(tierId, instanceId)}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Enter Match'}
          </button>
        )}
        {!isEnrolled && status >= 1 && (
          <button
            onClick={() => onViewBracket(tierId, instanceId)}
            className="flex-1 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold py-2 px-4 rounded-lg transition-all"
          >
            View Bracket
          </button>
        )}
      </div>
    </GlassPanel>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Battleship() {
  // ---- Theme State ----
  const [theme, setTheme] = useState('dream');
  const themeConfig = THEMES[theme];

  // ---- Wallet & Contract State ----
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractStatus, setContractStatus] = useState('not_checked');

  // ---- Loading States ----
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);

  // ---- Tournament State ----
  const [tournaments, setTournaments] = useState([]);
  const [viewingTournament, setViewingTournament] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(null);

  // ---- Ship Placement State ----
  const [placedShips, setPlacedShips] = useState({});
  const [shipOrientations, setShipOrientations] = useState({
    carrier: 'h', battleship: 'h', cruiser: 'h', submarine: 'h', destroyer: 'h'
  });
  const [draggedShip, setDraggedShip] = useState(null);
  const [previewCells, setPreviewCells] = useState([]);
  const [previewValid, setPreviewValid] = useState(false);

  // ---- Commit-Reveal State ----
  const [commitment, setCommitment] = useState(null);
  const [signature, setSignature] = useState(null);
  const [shipPositions, setShipPositions] = useState(null);

  // ---- Board State ----
  const [myBoard, setMyBoard] = useState(Array(100).fill(CellState.Empty));
  const [opponentBoard, setOpponentBoard] = useState(Array(100).fill(CellState.Unknown));
  const [selectedTargetCell, setSelectedTargetCell] = useState(null);

  // ---- Sync State ----
  const [syncDots, setSyncDots] = useState(1);

  // ---- Refs for polling ----
  const matchRef = useRef(currentMatch);
  const contractRef = useRef(contract);
  const accountRef = useRef(account);

  // Update refs
  useEffect(() => { matchRef.current = currentMatch; }, [currentMatch]);
  useEffect(() => { contractRef.current = contract; }, [contract]);
  useEffect(() => { accountRef.current = account; }, [account]);

  // ============================================================================
  // WALLET CONNECTION
  // ============================================================================

  const switchToNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
              chainName: 'Local Network',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['http://127.0.0.1:8545'],
            }],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          alert('Failed to add network. Please add it manually.');
        }
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this dApp!');
        return;
      }

      setLoading(true);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();

      setNetworkInfo({
        name: network.name || 'Unknown',
        chainId: network.chainId.toString(),
        isCorrect: network.chainId === BigInt(EXPECTED_CHAIN_ID)
      });

      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        const shouldSwitch = window.confirm(
          `Wrong network detected. Switch to the correct network?`
        );
        if (shouldSwitch) {
          await switchToNetwork();
          window.location.reload();
          return;
        }
      }

      const web3Signer = await web3Provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, BATTLESHIP_ABI, web3Signer);

      setAccount(accounts[0]);
      setContract(contractInstance);
      await loadTournaments(contractInstance, accounts[0]);
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
      setLoading(false);
    }
  };

  // ============================================================================
  // CONTRACT INTERACTIONS
  // ============================================================================

  const loadTournaments = async (contractInstance, userAccount) => {
    try {
      setTournamentsLoading(true);
      const tournamentList = [];

      // Load tiers 0-6
      for (let tierId = 0; tierId < 7; tierId++) {
        try {
          const tierConfig = await contractInstance.tierConfigs(tierId);
          const instanceCount = await contractInstance.INSTANCE_COUNTS(tierId);
          const entryFee = await contractInstance.ENTRY_FEES(tierId);

          for (let instanceId = 0; instanceId < Number(instanceCount); instanceId++) {
            const info = await contractInstance.getTournamentInfo(tierId, instanceId);
            let isEnrolled = false;

            if (userAccount) {
              isEnrolled = await contractInstance.isEnrolled(tierId, instanceId, userAccount);
            }

            tournamentList.push({
              tierId,
              instanceId,
              status: Number(info.status),
              enrolledCount: Number(info.enrolledCount),
              maxPlayers: Number(tierConfig.playerCount),
              prizePool: ethers.formatEther(info.prizePool),
              entryFee: ethers.formatEther(entryFee),
              isEnrolled,
              currentRound: Number(info.currentRound)
            });
          }
        } catch (err) {
          console.log(`Tier ${tierId} not configured`);
        }
      }

      setTournaments(tournamentList);
      setTournamentsLoading(false);
      setInitialLoading(false);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      setTournamentsLoading(false);
      setInitialLoading(false);
    }
  };

  const enrollInTournament = async (tierId, instanceId, entryFee) => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      const feeInWei = ethers.parseEther(entryFee);
      const tx = await contract.enrollInTournament(tierId, instanceId, { value: feeInWei });
      await tx.wait();

      alert('Successfully enrolled in tournament!');
      await loadTournaments(contract, account);
      setLoading(false);
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll: ' + parseContractError(error));
      setLoading(false);
    }
  };

  const loadMatchData = async (tierId, instanceId, roundNumber, matchNumber) => {
    if (!contract || !account) return null;

    try {
      const matchState = await contract.getMatchState(tierId, instanceId, roundNumber, matchNumber);

      // Check if match actually exists (player1 won't be zero address if match exists)
      if (matchState.player1 === ethers.ZeroAddress) {
        return null; // Match not initialized yet
      }

      const isPlayer1 = matchState.player1.toLowerCase() === account.toLowerCase();
      const isPlayer2 = matchState.player2.toLowerCase() === account.toLowerCase();

      if (!isPlayer1 && !isPlayer2) return null;

      let myBoardData = Array(100).fill(CellState.Empty);
      let opponentBoardData = Array(100).fill(CellState.Unknown);

      // Only fetch boards if both players have revealed
      if (matchState.player1Revealed && matchState.player2Revealed) {
        try {
          myBoardData = await contract.getMyBoard(tierId, instanceId, roundNumber, matchNumber);
          myBoardData = Array.from(myBoardData).map(s => Number(s));
        } catch (e) {
          console.log('Could not fetch my board:', e);
        }

        try {
          opponentBoardData = await contract.getOpponentBoard(tierId, instanceId, roundNumber, matchNumber);
          opponentBoardData = Array.from(opponentBoardData).map(s => Number(s));
        } catch (e) {
          console.log('Could not fetch opponent board:', e);
        }
      }

      return {
        tierId,
        instanceId,
        roundNumber,
        matchNumber,
        player1: matchState.player1,
        player2: matchState.player2,
        currentTurn: matchState.currentTurn,
        winner: matchState.winner,
        status: Number(matchState.status),
        phase: Number(matchState.phase),
        player1Committed: matchState.player1Committed,
        player2Committed: matchState.player2Committed,
        player1Revealed: matchState.player1Revealed,
        player2Revealed: matchState.player2Revealed,
        player1ShipsRemaining: Number(matchState.player1ShipsRemaining),
        player2ShipsRemaining: Number(matchState.player2ShipsRemaining),
        isYourTurn: matchState.currentTurn.toLowerCase() === account.toLowerCase(),
        isPlayer1,
        myBoard: myBoardData,
        opponentBoard: opponentBoardData,
        matchExists: true
      };
    } catch (error) {
      // Only log if it's not a simple "match doesn't exist" revert
      if (!error.message?.includes('require(false)')) {
        console.error('Error loading match:', error);
      }
      return null;
    }
  };

  // Find player's active match using the new findPlayerMatch contract function
  const findPlayerMatchInTournament = async (targetTierId, targetInstanceId) => {
    if (!contract || !account) return null;

    try {
      setLoading(true);

      // Use the new findPlayerMatch function - much simpler!
      console.log('Finding player match for:', account);
      const result = await contract.findPlayerMatch(account);
      console.log('findPlayerMatch result:', result);

      const {
        found,
        tierId,
        instanceId,
        roundNumber,
        matchNumber,
        phase,
        opponent,
        isPlayerTurn,
        playerHasCommitted,
        playerHasRevealed,
        opponentHasCommitted,
        opponentHasRevealed
      } = result;

      if (!found) {
        alert('No active match found. The tournament may not have started yet, or you may have been eliminated.');
        setLoading(false);
        return null;
      }

      // Check if match belongs to the target tournament
      if (Number(tierId) !== targetTierId || Number(instanceId) !== targetInstanceId) {
        alert(`Your active match is in a different tournament (Tier ${tierId}, Instance ${instanceId}). Please enter that tournament instead.`);
        setLoading(false);
        return null;
      }

      // Get additional match details from getMatchState
      const matchState = await contract.getMatchState(
        Number(tierId), Number(instanceId), Number(roundNumber), Number(matchNumber)
      );

      const isPlayer1 = matchState.player1.toLowerCase() === account.toLowerCase();

      const matchData = {
        tierId: Number(tierId),
        instanceId: Number(instanceId),
        roundNumber: Number(roundNumber),
        matchNumber: Number(matchNumber),
        player1: matchState.player1,
        player2: matchState.player2,
        opponent: opponent,
        currentTurn: matchState.currentTurn,
        winner: matchState.winner,
        status: Number(matchState.status),
        phase: Number(phase),
        player1Committed: playerHasCommitted && isPlayer1 ? true : matchState.player1Committed,
        player2Committed: playerHasCommitted && !isPlayer1 ? true : matchState.player2Committed,
        player1Revealed: playerHasRevealed && isPlayer1 ? true : matchState.player1Revealed,
        player2Revealed: playerHasRevealed && !isPlayer1 ? true : matchState.player2Revealed,
        player1ShipsRemaining: Number(matchState.player1ShipsRemaining),
        player2ShipsRemaining: Number(matchState.player2ShipsRemaining),
        isYourTurn: isPlayerTurn,
        isPlayer1,
        myCommitted: playerHasCommitted,
        myRevealed: playerHasRevealed,
        opponentCommitted: opponentHasCommitted,
        opponentRevealed: opponentHasRevealed,
        myBoard: Array(100).fill(CellState.Empty),
        opponentBoard: Array(100).fill(CellState.Unknown),
        matchExists: true
      };

      console.log('Match data:', matchData);

      setCurrentMatch(matchData);
      setMyBoard(matchData.myBoard);
      setOpponentBoard(matchData.opponentBoard);

      // Try to load saved commit data (tournament-level)
      const savedData = loadCommitData(Number(tierId), Number(instanceId));
      if (savedData) {
        setShipPositions(savedData.positions);
        setSignature(savedData.signature);
        setCommitment(savedData.commitment);

        // If we have saved placement data, restore the placed ships for display
        if (savedData.positions) {
          const restoredPlacement = convertPositionsToPlacement(savedData.positions);
          if (restoredPlacement) {
            setPlacedShips(restoredPlacement);
          }
        }
      }

      setLoading(false);
      return matchData;

    } catch (error) {
      console.error('Error finding match:', error);
      alert('Error finding your match: ' + parseContractError(error));
      setLoading(false);
      return null;
    }
  };

  // Helper to convert positions array back to placement object for display
  const convertPositionsToPlacement = (positions) => {
    if (!positions || positions.length !== 17) return null;

    const ships = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
    const sizes = [5, 4, 3, 3, 2];
    const placement = {};
    let idx = 0;

    for (let i = 0; i < ships.length; i++) {
      const cells = [];
      for (let j = 0; j < sizes[i]; j++) {
        cells.push(positions[idx++]);
      }
      // Determine orientation from cells
      const isHorizontal = cells.length > 1 && cells[1] - cells[0] === 1;
      placement[ships[i]] = { cells, orientation: isHorizontal ? 'h' : 'v' };
    }

    return placement;
  };

  // ============================================================================
  // SHIP PLACEMENT HANDLERS
  // ============================================================================

  const handleDragStart = (ship, orientation) => {
    setDraggedShip({ ...ship, orientation });
  };

  const handleDragEnd = () => {
    // Clean up drag state when drag ends (dropped or cancelled)
    setDraggedShip(null);
    setPreviewCells([]);
    setPreviewValid(false);
  };

  const handleDragOver = (e, cellIndex) => {
    e.preventDefault();
    if (!draggedShip) return;

    const cells = calculateShipCells(cellIndex, draggedShip.size, draggedShip.orientation);
    const isValid = validatePlacement(cells, placedShips, draggedShip.id);

    setPreviewCells(cells);
    setPreviewValid(isValid);
  };

  const handleDragLeave = () => {
    // Clear preview when leaving the board area
    setPreviewCells([]);
    setPreviewValid(false);
  };

  const handleDrop = (e, cellIndex) => {
    e.preventDefault();
    if (!draggedShip) return;

    const cells = calculateShipCells(cellIndex, draggedShip.size, draggedShip.orientation);
    const isValid = validatePlacement(cells, placedShips, draggedShip.id);

    if (isValid && cells.length > 0) {
      setPlacedShips(prev => ({
        ...prev,
        [draggedShip.id]: { cells, orientation: draggedShip.orientation }
      }));
    }

    // Note: Don't clear draggedShip here - let handleDragEnd do it
    // This prevents issues with drag state
    setPreviewCells([]);
    setPreviewValid(false);
  };

  const handleRotate = (shipId) => {
    setShipOrientations(prev => ({
      ...prev,
      [shipId]: prev[shipId] === 'h' ? 'v' : 'h'
    }));
  };

  const clearPlacement = () => {
    setPlacedShips({});
  };

  const allShipsPlaced = Object.keys(placedShips).length === Object.keys(SHIP_TYPES).length;

  // ============================================================================
  // COMMIT-REVEAL HANDLERS
  // ============================================================================

  const signAndCommit = async () => {
    if (!contract || !account || !currentMatch || !allShipsPlaced) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      // 1. Get commit message from contract (tournament-level, not match-level)
      const commitMessage = await contract.getCommitMessage(tierId, instanceId, account);

      // 2. Sign with MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const sig = await signer.signMessage(ethers.getBytes(commitMessage));

      // 3. Convert ship placements to positions array
      const positions = convertPlacementToPositions(placedShips);

      // 4. Generate commitment hash
      const commitmentHash = await contract.generateCommitment(positions, sig);

      // 5. Submit commitment to contract
      const tx = await contract.commitBoard(tierId, instanceId, roundNumber, matchNumber, commitmentHash);
      await tx.wait();

      // 6. Save locally for reveal phase (tournament-level storage)
      setShipPositions(positions);
      setSignature(sig);
      setCommitment(commitmentHash);

      saveCommitData(tierId, instanceId, { positions, signature: sig, commitment: commitmentHash });

      alert('Board committed successfully! Wait for opponent to commit.');

      // Refresh match data
      const updated = await loadMatchData(tierId, instanceId, roundNumber, matchNumber);
      if (updated) setCurrentMatch(updated);

      setMatchLoading(false);
    } catch (error) {
      console.error('Error committing board:', error);
      alert('Failed to commit: ' + parseContractError(error));
      setMatchLoading(false);
    }
  };

  const revealBoard = async () => {
    if (!contract || !account || !currentMatch) return;

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      // Load saved commit data (tournament-level storage)
      let positions = shipPositions;
      let sig = signature;

      if (!positions || !sig) {
        const saved = loadCommitData(tierId, instanceId);
        if (saved) {
          positions = saved.positions;
          sig = saved.signature;
        } else {
          alert('No commitment data found. Did you commit from this browser?');
          setMatchLoading(false);
          return;
        }
      }

      // Submit reveal
      const tx = await contract.revealBoard(
        tierId, instanceId, roundNumber, matchNumber,
        positions, sig
      );
      await tx.wait();

      alert('Board revealed successfully!');

      // Refresh match data
      const updated = await loadMatchData(tierId, instanceId, roundNumber, matchNumber);
      if (updated) {
        setCurrentMatch(updated);
        setMyBoard(updated.myBoard);
        setOpponentBoard(updated.opponentBoard);
      }

      setMatchLoading(false);
    } catch (error) {
      console.error('Error revealing board:', error);
      alert('Failed to reveal: ' + parseContractError(error));
      setMatchLoading(false);
    }
  };

  // ============================================================================
  // COMBAT HANDLERS
  // ============================================================================

  const handleTargetSelect = (cellIndex) => {
    if (!currentMatch?.isYourTurn) return;
    if (opponentBoard[cellIndex] !== CellState.Unknown) return;
    setSelectedTargetCell(cellIndex);
  };

  const fireShot = async () => {
    if (!contract || !account || !currentMatch || selectedTargetCell === null) return;
    if (!currentMatch.isYourTurn) {
      alert("It's not your turn!");
      return;
    }

    try {
      setMatchLoading(true);
      const { tierId, instanceId, roundNumber, matchNumber } = currentMatch;

      const tx = await contract.fireShot(
        tierId, instanceId, roundNumber, matchNumber, selectedTargetCell
      );
      await tx.wait();

      // Refresh match data
      const updated = await loadMatchData(tierId, instanceId, roundNumber, matchNumber);
      if (updated) {
        setCurrentMatch(updated);
        setMyBoard(updated.myBoard);
        setOpponentBoard(updated.opponentBoard);
      }

      setSelectedTargetCell(null);
      setMatchLoading(false);
    } catch (error) {
      console.error('Error firing shot:', error);
      alert('Failed to fire: ' + parseContractError(error));
      setMatchLoading(false);
    }
  };

  // ============================================================================
  // POLLING EFFECT
  // ============================================================================

  useEffect(() => {
    if (!currentMatch || !contract) return;

    const pollMatch = async () => {
      const { tierId, instanceId, roundNumber, matchNumber } = matchRef.current;
      const updated = await loadMatchData(tierId, instanceId, roundNumber, matchNumber);
      if (updated) {
        setCurrentMatch(updated);
        setMyBoard(updated.myBoard);
        setOpponentBoard(updated.opponentBoard);
      }
    };

    const pollInterval = setInterval(pollMatch, 3000);
    return () => clearInterval(pollInterval);
  }, [currentMatch?.tierId, currentMatch?.instanceId, currentMatch?.roundNumber, currentMatch?.matchNumber]);

  // Sync dots animation
  useEffect(() => {
    if (!currentMatch) return;
    const dotsInterval = setInterval(() => {
      setSyncDots(prev => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(dotsInterval);
  }, [currentMatch]);

  // Listen for wallet changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setContract(null);
      } else {
        connectWallet();
      }
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, BATTLESHIP_ABI, provider);
          await loadTournaments(readOnlyContract, null);
        } catch (e) {
          console.log('Could not initialize read-only contract');
          setInitialLoading(false);
        }
      } else {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getMatchPhase = () => {
    if (!currentMatch) return 'SETUP';

    const { phase, player1Committed, player2Committed, player1Revealed, player2Revealed, isPlayer1 } = currentMatch;

    // Use direct values from findPlayerMatch if available, otherwise calculate
    const myCommitted = currentMatch.myCommitted !== undefined
      ? currentMatch.myCommitted
      : (isPlayer1 ? player1Committed : player2Committed);
    const opponentCommitted = currentMatch.opponentCommitted !== undefined
      ? currentMatch.opponentCommitted
      : (isPlayer1 ? player2Committed : player1Committed);
    const myRevealed = currentMatch.myRevealed !== undefined
      ? currentMatch.myRevealed
      : (isPlayer1 ? player1Revealed : player2Revealed);
    const opponentRevealed = currentMatch.opponentRevealed !== undefined
      ? currentMatch.opponentRevealed
      : (isPlayer1 ? player2Revealed : player1Revealed);

    if (phase === MatchPhase.Completed) return 'END';
    if (phase === MatchPhase.Combat) return 'COMBAT';

    // Setup phase
    if (!myCommitted) return 'SETUP';
    if (!opponentCommitted) return 'WAIT_COMMIT';
    if (!myRevealed) return 'REVEAL';
    if (!opponentRevealed) return 'WAIT_REVEAL';

    return 'COMBAT';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Particle Background */}
      <ParticleBackground
        colors={[themeConfig.primary, themeConfig.secondary]}
        symbols={themeConfig.particles}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes particle-float {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <header className="relative z-10 border-b border-cyan-500/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <div className="flex items-center gap-2">
              <Ship className="text-cyan-400" size={28} />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Eternal Battleship
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(t => t === 'dream' ? 'daring' : 'dream')}
              className="px-3 py-1 rounded-lg border border-cyan-500/30 text-sm text-slate-300 hover:text-white transition-colors"
            >
              {theme === 'dream' ? '🌊 Dream' : '🔥 Daring'}
            </button>

            {/* Wallet Connection */}
            {account ? (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 font-mono text-sm">{shortenAddress(account)}</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                <Wallet size={18} />
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {initialLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Ship className="animate-bounce mx-auto mb-4 text-cyan-400" size={48} />
              <p className="text-slate-400">Loading tournaments...</p>
            </div>
          </div>
        )}

        {/* Match View */}
        {currentMatch && !initialLoading && (
          <div>
            {/* Back Button */}
            <button
              onClick={() => setCurrentMatch(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Tournaments
            </button>

            {/* Match Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">
                Match: {shortenAddress(currentMatch.player1)} vs {shortenAddress(currentMatch.player2)}
              </h2>
              <p className="text-slate-400">
                Round {currentMatch.roundNumber + 1} • Match {currentMatch.matchNumber + 1}
              </p>
              {currentMatch && (
                <p className="text-xs text-slate-500 mt-1">
                  Syncing{'.'.repeat(syncDots)}
                </p>
              )}
            </div>

            {/* Commit-Reveal Status */}
            <CommitRevealStatus match={currentMatch} account={account} theme={theme} />

            {/* Phase: Setup (Place Ships) */}
            {getMatchPhase() === 'SETUP' && (
              <div className="grid md:grid-cols-2 gap-6">
                <ShipDock
                  placedShips={placedShips}
                  shipOrientations={shipOrientations}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onRotate={handleRotate}
                />
                <div>
                  <BoardGrid
                    board={myBoard}
                    isYourBoard={true}
                    placedShips={placedShips}
                    previewCells={previewCells}
                    previewValid={previewValid}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    theme={theme}
                    title="Place Your Ships"
                  />
                  <div className="mt-4 flex gap-4">
                    <button
                      onClick={clearPlacement}
                      className="px-4 py-2 border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={signAndCommit}
                      disabled={!allShipsPlaced || matchLoading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                    >
                      {matchLoading ? 'Committing...' : 'Lock In Board & Sign'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Phase: Waiting for Opponent Commit */}
            {getMatchPhase() === 'WAIT_COMMIT' && (
              <div className="text-center py-12">
                <Lock className="mx-auto mb-4 text-yellow-400 animate-pulse" size={48} />
                <h3 className="text-xl font-bold mb-2">Board Committed!</h3>
                <p className="text-slate-400">Waiting for opponent to commit their board...</p>
              </div>
            )}

            {/* Phase: Reveal */}
            {getMatchPhase() === 'REVEAL' && (
              <div className="text-center py-12">
                <Eye className="mx-auto mb-4 text-cyan-400" size={48} />
                <h3 className="text-xl font-bold mb-2">Both Players Committed!</h3>
                <p className="text-slate-400 mb-6">Time to reveal your board to start the battle.</p>
                <button
                  onClick={revealBoard}
                  disabled={matchLoading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-all disabled:opacity-50"
                >
                  {matchLoading ? 'Revealing...' : 'Reveal Board'}
                </button>
              </div>
            )}

            {/* Phase: Waiting for Opponent Reveal */}
            {getMatchPhase() === 'WAIT_REVEAL' && (
              <div className="text-center py-12">
                <Eye className="mx-auto mb-4 text-yellow-400 animate-pulse" size={48} />
                <h3 className="text-xl font-bold mb-2">Board Revealed!</h3>
                <p className="text-slate-400">Waiting for opponent to reveal their board...</p>
              </div>
            )}

            {/* Phase: Combat */}
            {getMatchPhase() === 'COMBAT' && (
              <div>
                <TurnIndicator
                  isYourTurn={currentMatch.isYourTurn}
                  currentTurn={currentMatch.currentTurn}
                  account={account}
                />

                <div className="grid md:grid-cols-3 gap-6 mt-6">
                  {/* Your Board */}
                  <div className="text-center">
                    <BoardGrid
                      board={myBoard}
                      isYourBoard={true}
                      placedShips={placedShips}
                      theme={theme}
                      title="Your Fleet"
                    />
                    <ShipsRemaining
                      remaining={currentMatch.isPlayer1 ? currentMatch.player1ShipsRemaining : currentMatch.player2ShipsRemaining}
                      total={17}
                      label="Ships Remaining"
                    />
                  </div>

                  {/* Center Controls */}
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Swords className="text-cyan-400" size={48} />
                    {selectedTargetCell !== null && (
                      <div className="text-center">
                        <p className="text-slate-400 mb-2">Target: {cellToCoord(selectedTargetCell)}</p>
                        <button
                          onClick={fireShot}
                          disabled={matchLoading || !currentMatch.isYourTurn}
                          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-all disabled:opacity-50"
                        >
                          {matchLoading ? 'Firing...' : 'FIRE!'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Opponent Board */}
                  <div className="text-center">
                    <BoardGrid
                      board={opponentBoard}
                      isYourBoard={false}
                      selectedCell={selectedTargetCell}
                      onCellClick={handleTargetSelect}
                      disabled={!currentMatch.isYourTurn || matchLoading}
                      theme={theme}
                      title="Enemy Waters"
                    />
                    <ShipsRemaining
                      remaining={currentMatch.isPlayer1 ? currentMatch.player2ShipsRemaining : currentMatch.player1ShipsRemaining}
                      total={17}
                      label="Enemy Ships"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Phase: Game End */}
            {getMatchPhase() === 'END' && (
              <div className="text-center py-12">
                <Trophy className="mx-auto mb-4 text-yellow-400" size={64} />
                <h3 className="text-3xl font-bold mb-2">
                  {currentMatch.winner?.toLowerCase() === account?.toLowerCase() ? 'Victory!' : 'Defeat'}
                </h3>
                <p className="text-slate-400">
                  Winner: {shortenAddress(currentMatch.winner)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tournament List */}
        {!currentMatch && !initialLoading && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Naval Warfare Tournaments</h2>
              <p className="text-slate-400">Join a tournament and battle for ETH prizes</p>
            </div>

            {!account && (
              <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-cyan-500/20 mb-8">
                <Wallet className="mx-auto mb-4 text-slate-500" size={48} />
                <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                <p className="text-slate-400 mb-4">Connect your wallet to view and join tournaments</p>
                <button
                  onClick={connectWallet}
                  disabled={loading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            )}

            {tournamentsLoading ? (
              <div className="text-center py-12">
                <Ship className="animate-bounce mx-auto mb-4 text-cyan-400" size={48} />
                <p className="text-slate-400">Loading tournaments...</p>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
                <AlertCircle className="mx-auto mb-4 text-slate-500" size={48} />
                <h3 className="text-xl font-bold mb-2">No Tournaments Available</h3>
                <p className="text-slate-400">Check back later or deploy the contract.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map(t => (
                  <TournamentCard
                    key={`${t.tierId}-${t.instanceId}`}
                    tournament={t}
                    account={account}
                    onEnroll={enrollInTournament}
                    onViewBracket={(tierId, instanceId) => {
                      findPlayerMatchInTournament(tierId, instanceId);
                    }}
                    loading={loading}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/20 mt-16 py-8 text-center text-slate-500 text-sm">
        <p>Eternal Battleship • Built on ETour Protocol • Fully On-Chain</p>
      </footer>
    </div>
  );
}
