// 编译
const { src, dest, parallel, series, watch } = require('gulp')
const browserSync = require("browser-sync")
const loadPlugins = require("gulp-load-plugins")
const plugin = loadPlugins()
const bs = browserSync.create()

// const sass = require("gulp-sass")
// const babel = require("gulp-babel")
// const swig = require("gulp-swig")
// const imagemin = require("gulp-imagemin")
const del = require("del")
const cwd = process.cwd()
let config = {
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**',
    },
  }
}

try {
  const temp = require(`${cwd}/pages.config.js`) 
  config = Object.assign({}, config, temp)
} catch (error) {}


// 自动清除目录
const clean = () => {
  return del([config.build.dist, config.build.temp])
}
// 样式编译
const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src})
    .pipe(plugin.sass({ outputStyle: 'expanded'}))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true}))
}
// 脚本编译
const scripts = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src})
    .pipe(plugin.babel({ presets: [require('@babel/preset-env')]}))
    .pipe(dest(config.build.temp)) 
    .pipe(bs.reload({ stream: true}))
}
// 模板编译
const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src})
  .pipe(plugin.swig({ data: config.data, defaults: { cache: false} })) // 防止模板缓存导致不刷新
  .pipe(dest(config.build.temp))
  .pipe(bs.reload({ stream: true}))
}
// 图片编译
const images = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src})
  .pipe(plugin.imagemin())
  .pipe(dest(config.build.dist))
}
// 字体编译
const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src})
  .pipe(plugin.imagemin())
  .pipe(dest(config.build.dist))
}
// 其他文件
const extra = () => {
  return src("**", { base: config.build.public, cwd: config.build.public})
  .pipe(dest(config.build.dist))
}
// 开发服务器
const serve = () => {
// 可能会因为swig 模板引擎缓存机制导致页面不会变化，此时需要额外将swig选项中的cache选项设置为false
  watch(config.build.paths.styles, { cwd: config.build.src}, style)
  watch(config.build.paths.scripts, { cwd: config.build.src}, scripts)
  watch(config.build.paths.pages, { cwd: config.build.src}, page)
  // watch("src/assets/images/**", images)
  // watch("src/assets/fonts/**", font)
  // watch("public/**", extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
  ], { cwd: config.build.src }, bs.reload)

  watch("**", { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 8080,
    // open: false,
    // files: "dist/*",
    server: {
      baseDir: [config.build.temp, config.build.dist, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp})
  .pipe(plugin.useref({ searchPath: [config.build.temp, '.']}))
  // html => gulp-htmlmin, css => gulp-clean-css, js=> gulp-uglify
  // 判断文件类型 gulp-if
  .pipe(plugin.if(/\.js$/, plugin.uglify()))
  .pipe(plugin.if(/\.css$/, plugin.cleanCss()))
  .pipe(plugin.if(/\.html$/, plugin.htmlmin({ 
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
  })))
  .pipe(dest(config.build.dist))
}


const compile = parallel(style, scripts, page,)
// 上线之前执行构建
const build = series(
  clean, 
  parallel(
    series(compile, useref), 
    images, 
    font, 
    extra
  )
)

const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}