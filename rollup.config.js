import commonJs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

const ecma = 2019
const nodeEnv = '"production"'

export default {
  input: 'src/main.js',
  output: {
    file: 'docs/bundle.js',
    format: 'es',
    compact: true,
    inlineDynamicImports: true
  },
  plugins: [
    resolve({browser: true, preferBuiltins: false}),
    commonJs(),
    replace({
      'process.env.NODE_ENV': nodeEnv,
      'process?.env?.NODE_ENV': nodeEnv,
      preventAssignment: true
    }),
    terser({
      compress: {
        ecma,
        drop_console: ['log', 'info'],
        keep_fargs: false,
        module: true,
        toplevel: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_symbols: true
      },
      format: {comments: false, ecma},
      mangle: {module: true, toplevel: true}
    })
  ]
}
