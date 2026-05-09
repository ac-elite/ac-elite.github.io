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
  bgcolor: 'rgba(10,22,47,0.88)',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(191,225,255,0.4)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(191,225,255,0.65)',
  },
  '&.Mui-focused': {
    boxShadow: '0 0 0 3px rgba(173, 216, 255, 0.22)',
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
