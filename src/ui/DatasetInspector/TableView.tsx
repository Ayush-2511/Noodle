import React, { useState, useMemo } from 'react';
import { TabularDataset } from '../../core/authenticDatasets';
import { ChevronLeft, ChevronRight, ArrowUpDown, Search } from 'lucide-react';

interface TableViewProps {
  dataset: TabularDataset;
}

export const TableView: React.FC<TableViewProps> = ({ dataset }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    let list = dataset.rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((row) =>
        row.some((cell) => String(cell).toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      const colIdx = dataset.headers.indexOf(sortCol);
      if (colIdx >= 0) {
        list = [...list].sort((a, b) => {
          const valA = a[colIdx];
          const valB = b[colIdx];
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortAsc ? valA - valB : valB - valA;
          }
          return sortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        });
      }
    }

    return list;
  }, [dataset.rows, dataset.headers, searchQuery, sortCol, sortAsc]);

  const maxPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  // Column statistics (min, max, mean for numeric columns)
  const columnStats = useMemo(() => {
    const stats: Record<string, { min: number; max: number; mean: number; count: number } | null> = {};
    for (let c = 0; c < dataset.headers.length; c++) {
      const header = dataset.headers[c];
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let numericCount = 0;

      for (let r = 0; r < dataset.rows.length; r++) {
        const val = dataset.rows[r][c];
        if (typeof val === 'number') {
          if (val < min) min = val;
          if (val > max) max = val;
          sum += val;
          numericCount++;
        }
      }

      if (numericCount > 0) {
        stats[header] = {
          min,
          max,
          mean: sum / numericCount,
          count: numericCount,
        };
      } else {
        stats[header] = null;
      }
    }
    return stats;
  }, [dataset]);

  const handleSort = (header: string) => {
    if (sortCol === header) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(header);
      setSortAsc(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Search & Statistics Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1e1e1e',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #2d2d2d',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '360px' }}>
          <Search size={13} color="#666666" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search rows..."
            style={{
              backgroundColor: '#141414',
              border: '1px solid #333333',
              borderRadius: '3px',
              padding: '4px 8px',
              color: '#ffffff',
              fontSize: '0.75rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', color: '#94a3b8' }}>
          <span>
            Total Rows: <strong style={{ color: '#f8fafc' }}>{dataset.rowCount.toLocaleString()}</strong>
          </span>
          <span>
            Features: <strong style={{ color: '#38bdf8' }}>{dataset.featureColumns.length}</strong>
          </span>
          <span>
            Target Column: <strong style={{ color: '#10b981' }}>{dataset.targetColumn}</strong>
          </span>
        </div>
      </div>

      {/* Interactive Table Grid */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '8px 10px', width: '50px', color: '#64748b' }}>#</th>
              {dataset.headers.map((h) => {
                const isTarget = h === dataset.targetColumn;
                const stat = columnStats[h];
                return (
                  <th
                    key={h}
                    onClick={() => handleSort(h)}
                    style={{
                      padding: '8px 12px',
                      color: isTarget ? '#34d399' : '#cbd5e1',
                      fontWeight: 600,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{h}</span>
                      <ArrowUpDown size={11} color={sortCol === h ? '#38bdf8' : '#64748b'} />
                      {isTarget && (
                        <span
                          style={{
                            fontSize: '0.6rem',
                            backgroundColor: '#064e3b',
                            color: '#6ee7b7',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            border: '1px solid #059669',
                          }}
                        >
                          Target
                        </span>
                      )}
                    </div>
                    {stat && (
                      <div style={{ fontSize: '0.62rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>
                        μ:{stat.mean.toFixed(2)} [{stat.min.toFixed(1)}..{stat.max.toFixed(1)}]
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rIdx) => {
              const actualIndex = page * pageSize + rIdx;
              return (
                <tr
                  key={actualIndex}
                  style={{
                    borderBottom: '1px solid #1e293b',
                    backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'rgba(30, 41, 59, 0.3)',
                  }}
                >
                  <td style={{ padding: '6px 10px', color: '#64748b', fontFamily: 'monospace' }}>
                    {actualIndex}
                  </td>
                  {row.map((cell, cIdx) => {
                    const isTarget = dataset.headers[cIdx] === dataset.targetColumn;
                    return (
                      <td
                        key={cIdx}
                        style={{
                          padding: '6px 12px',
                          color: isTarget ? '#34d399' : '#f1f5f9',
                          fontFamily: typeof cell === 'number' ? 'monospace' : 'inherit',
                          fontWeight: isTarget ? 600 : 400,
                        }}
                      >
                        {typeof cell === 'number' ? cell.toFixed(3).replace(/\.?0+$/, '') : String(cell)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: page === 0 ? '#475569' : '#cbd5e1',
              border: '1px solid #334155',
              fontSize: '0.75rem',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Page <strong style={{ color: '#f8fafc' }}>{page + 1}</strong> of {maxPages} (
            {filteredRows.length} rows)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPages - 1, p + 1))}
            disabled={page >= maxPages - 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: page >= maxPages - 1 ? '#475569' : '#cbd5e1',
              border: '1px solid #334155',
              fontSize: '0.75rem',
              cursor: page >= maxPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
