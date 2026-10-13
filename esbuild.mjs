import esbuild from 'esbuild'

const watch = process.argv.includes('--watch')

const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  minify: !watch,
}

if (watch) {
  const ctx = await esbuild.context(options)
  await ctx.watch()
  console.log('esbuild watching…')
} else {
  await esbuild.build(options)
  console.log('extension bundled → dist/extension.js')
}
