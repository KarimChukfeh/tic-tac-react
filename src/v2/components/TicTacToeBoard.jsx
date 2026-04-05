const SYMBOLS = {
  0: '',
  1: 'X',
  2: 'O',
};

export default function TicTacToeBoard({ board, disabled = false, onSelectCell }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {board.map((cell, index) => {
        const isFilled = Number(cell) !== 0;
        return (
          <button
            key={index}
            type="button"
            disabled={disabled || isFilled}
            onClick={() => onSelectCell(index)}
            className={`aspect-square rounded-2xl border text-4xl font-black transition ${
              isFilled
                ? 'border-slate-700 bg-slate-900/90 text-white'
                : disabled
                  ? 'border-slate-800 bg-slate-950/70 text-slate-500'
                  : 'border-cyan-500/40 bg-slate-900/70 text-cyan-300 hover:border-cyan-400 hover:bg-slate-800'
            }`}
          >
            {SYMBOLS[Number(cell)]}
          </button>
        );
      })}
    </div>
  );
}
