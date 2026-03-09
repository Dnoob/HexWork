// 数据表格组件：用于展示 Excel/CSV 读取结果
import { TablePreview } from '../../types';

interface DataTableProps {
  data: TablePreview;
}

export const DataTable = ({ data }: DataTableProps) => {
  const { headers, rows, totalRows } = data;

  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-3 py-1.5 text-left font-semibold text-foreground border border-border"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-3 py-1 text-muted-foreground border border-border max-w-[200px] truncate"
                  title={cell}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalRows !== undefined && totalRows > rows.length && (
        <p className="text-xs text-muted-foreground mt-1">
          显示前 {rows.length} 行，共 {totalRows} 行
        </p>
      )}
    </div>
  );
};
