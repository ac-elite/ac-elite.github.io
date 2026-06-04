import type { Theme, SxProps } from '@mui/material/styles';

// =============================================================================
// Glass-styled MUI Select — shared sx + MenuProps
// =============================================================================
// `<Select>` styling used on data pages (leaderboard track filter, rankings
// tabs/filters). Pulled out of the pages so the look stays in lock-step.
//
// Usage:
//   <FormControl size="small" sx={{ maxWidth: 420, width: '100%' }}>
//     <Select sx={GLASS_SELECT_SX} MenuProps={GLASS_SELECT_MENU_PROPS} ...>
//       <MenuItem value="..." sx={GLASS_SELECT_MENU_ITEM_SX}>...</MenuItem>
//     </Select>
//   </FormControl>
// =============================================================================

export const GLASS_SELECT_SX: SxProps<Theme> = {
  borderRadius: 2,
  color: '#fff',
  // Match the level-2 inner card (GLASS_CARD_INNER_SX), in lockstep with the
  // global outlined input (theme components.tsx): same subtle film + inset rims,
  // no backdrop blur (the parent card already blurs).
  bgcolor: 'rgba(255,255,255,0.012)',
  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.026) 0%, rgba(255,255,255,0.003) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.1)',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(226,242,255,0.12)',
  },
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.032)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(226,242,255,0.18)',
  },
  '&.Mui-focused': {
    bgcolor: 'rgba(255,255,255,0.04)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(147, 197, 253, 0.32)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(191,225,255,0.95)',
    borderWidth: 2,
  },
  '& .MuiSelect-select': {
    fontWeight: 700,
  },
  '& .MuiSvgIcon-root': {
    color: '#dbeafe',
  },
};

/**
 * Glass filter button — matches {@link GLASS_SELECT_SX} so a row of toggle
 * buttons (e.g. the Results session-type filter) reads as the same control
 * family as the adjacent track Select. `active` lights the focused accent rim.
 */
export const glassFilterButtonSx = (active: boolean): SxProps<Theme> => ({
  height: 40,
  px: 2,
  borderRadius: 2,
  fontWeight: 700,
  textTransform: 'none',
  color: '#fff',
  border: '1px solid',
  bgcolor: active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.012)',
  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.026) 0%, rgba(255,255,255,0.003) 100%)',
  borderColor: active ? 'rgba(191,225,255,0.95)' : 'rgba(226,242,255,0.12)',
  boxShadow: active
    ? 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(147,197,253,0.32)'
    : 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.1)',
  '&:hover': {
    bgcolor: active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.032)',
    borderColor: active ? 'rgba(191,225,255,0.95)' : 'rgba(226,242,255,0.18)',
  },
});

export const GLASS_SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      bgcolor: '#132447',
      color: '#fff',
      border: '1px solid rgba(191,225,255,0.3)',
      mt: 0.5,
    },
  },
} as const;

/** Highlight + hover styling for `<MenuItem>` children inside a glass Select. */
export const GLASS_SELECT_MENU_ITEM_SX: SxProps<Theme> = {
  '&.Mui-selected': {
    bgcolor: 'rgba(191,225,255,0.18)',
  },
  '&.Mui-selected:hover': {
    bgcolor: 'rgba(191,225,255,0.24)',
  },
};
