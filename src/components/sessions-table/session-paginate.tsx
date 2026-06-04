import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { GLASS_TABLE_PAGINATION_SX } from 'src/lib/glass';
import { PAGINATION_NAV_BUTTON_SX, PAGINATION_PAGE_BUTTON_SX } from 'src/lib/page-shell';

/** First / last / current±1 with `...` gaps — shared by every session list. */
function getVisiblePages(current: number, total: number) {
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (i === current - 2 || i === current + 2) {
      pages.push('...');
    }
  }
  return pages;
}

/** Glass pagination bar for session tables (Results page + driver profile). */
export function SessionPaginate({
  page,
  totalPages,
  onChange,
  motionIndex = 3,
}: {
  page: number;
  totalPages: number;
  onChange: (newPage: number) => void;
  /** Stagger index for the entrance animation (defaults to the Results layout). */
  motionIndex?: number;
}) {
  if (totalPages <= 1) return null;
  const pages = getVisiblePages(page, totalPages);

  return (
    <Paper sx={{ ...GLASS_TABLE_PAGINATION_SX, ...glassCardMotionSx(motionIndex) }}>
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        <Button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          variant="contained"
          color="secondary"
          size="small"
          sx={{ ...PAGINATION_NAV_BUTTON_SX }}
        >
          Prev
        </Button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <Typography key={`dots-${idx}`} sx={{ px: 1.25, py: 0.75 }}>
              ...
            </Typography>
          ) : (
            <Button
              key={p}
              onClick={() => onChange(p)}
              size="small"
              variant={p === page ? 'contained' : 'outlined'}
              color={p === page ? 'primary' : 'secondary'}
              sx={{ ...PAGINATION_PAGE_BUTTON_SX }}
            >
              {p}
            </Button>
          )
        )}
        <Button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          variant="contained"
          color="secondary"
          size="small"
          sx={{ ...PAGINATION_NAV_BUTTON_SX }}
        >
          Next
        </Button>
      </Stack>
    </Paper>
  );
}
