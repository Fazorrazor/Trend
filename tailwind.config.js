/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '480px',    // ≤480px: Extra small devices (phones)
        // sm: '640px',   // 481-768px: Small devices (default Tailwind)
        // md: '768px',   // 769-1024px: Medium devices (default Tailwind)
        // lg: '1024px',  // 1025-1440px: Large devices (default Tailwind)
        // xl: '1280px',  // >1440px: Extra large devices (default Tailwind)
        '2xl': '1440px', // Override default 2xl for better 1440px+ support
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
};
