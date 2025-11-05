import commonJs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'

const ecma = 2019
const nodeEnv = '"production"'

export default {
  input: 'src/main.js',
  output: {
    file: 'docs/bundle.js',
    format: 'es',
    compact: true,
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonJs(),
    replace({
      'process.env.NODE_ENV': nodeEnv,
      'process?.env?.NODE_ENV': nodeEnv,
      preventAssignment: true,
    }),
    terser({
      compress: {
        ecma,
        drop_console: false,
        keep_fargs: true,
        module: true,
        toplevel: false,
        unsafe: false,
        unsafe_arrows: false,
        unsafe_methods: false,
        unsafe_proto: false,
        unsafe_symbols: false,
      },
      format: { comments: false, ecma },
      mangle: false,
    }),
  ],
}
