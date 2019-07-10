/*
1 commander里面进行操作所有的逻辑
第一步: inquirer.prompt起个新名
第二步：去git上下载模板 shell.exec(git clone ${url})
第三步： readFileSync读取文件， 将模板中的{name} 替换真实的名字，然后写入writeFileSync文件
第四步： 安装模板里面的基础依赖 shell.exec(npm i)
*/
const fs = require('fs');
const path = require('path')
const commander = require('commander');
const download = require('download-git-repo');
const handlebars = require('handlebars');
const inquirer = require('inquirer');
const ora = require('ora');
const chalk = require('chalk');
const shell = require('shelljs')
const symbols = require('log-symbols');

const registry = {
    ssh: 'git@github.com:MuJinyo/mujin_demo.git', 
    https: 'https://github.com/MuJinyo/mujin_demo.git',
}
const createTemplatePath = name => path.join(__dirname, 'src', name)

function deleteFolderRecursive (path) {
    if(fs.existsSync(path)){
        fs.readdirSync(path).forEach(function(file){
            const curPath = path + "/" +file
            if(fs.statSync(curPath).isDirectory()) { 
                deleteFolderRecursive(curPath)
              } else { 
                fs.unlinkSync(curPath)
              }
        })
        fs.rmdirSync(path)
    }
}

// 下载git
const downloadTemplate = (name) => {
    return new Promise (async (resolve, reject) => {
        const anwser = await inquirer.prompt({
            name:'type',
            message:'请选择git仓库的克隆模式（default https）',
            type: 'list',
            choices: ['https', 'ssh'],
        })
        const url = registry[anwser.type]
        const spinner = ora('正在初始化项目目录：')
        spinner.start()

        shell.exec(`cd ${path.join(__dirname, 'src')} && git clone ${url} ${name}`, (code, stdout, stderr) => {
            if (code) {
                console.log(code)
                spinner.fail()
                console.log(symbol.error, chalk.green('发生错误'))
                return reject()
            }
            if(stdout){
                console.log(chalk.blue(stdout))
            }
            if(stderr){
                console.log(chalk.red(stderr))
            }
            deleteFolderRecursive(path.join(__dirname, 'src', name, '.git'))
            spinner.succeed()
            console.log(symbols.success, chalk.green('看样子是初始化成功了，别急一会再看！'))
            resolve()
        })

    })
}

// 进行替换的，将模板上的虚拟数据进行替换
const initPackageJson = (templatePath, name) => new Promise((resolve, reject) => {
    console.log('拼接--', path.join(templatePath, 'package.json'))
    const target = path.join(templatePath, 'package.json').trim()

    if(fs.existsSync(target)){
        const a = fs.readFileSync(target).toString()
        const b = handlebars.compile(a)({ name })
        fs.writeFileSync(target, b)
        resolve()
    } else {
        reject(new error('写入项目文件发生错误'))
    }

}) 

// 进行安装里面的依赖
const installDependencies = (templatePath) => new Promise( (resolve, reject) => {
    const spinner = ora('开始自动安装依赖 ...')
    spinner.start()
    shell.exec(`cd ${templatePath} && npm i`, (code, stdout, stderr) => {
        if(code) {
            console.log(code)
            spinner.fail()
            console.log(symbols.error, chalk.green('失败，自己手动试试吧'))
        }
        if (stdout) console.log(chalk.blue(stdout))
        if (stderr) console.error(chalk.red(stderr))

        spinner.text = '安装完成'
        spinner.succeed()
        console.log(symbols.success, chalk.green('安装成功'))
    })
    console.log(symbols.success, chalk.blue('你现在可以通过命令：', `cd ${templatePath} && npm run dev`, '来启动开发模式'))
    resolve()
})


commander.command('init').action(async () => {
    const createSettings = await inquirer.prompt({
        name: 'name',
        message: '给新项目起一个新的名字'
    })
    const {name} = createSettings
 
    console.log('lujing-->', !fs.existsSync(createTemplatePath(name)))
    if(!fs.existsSync(createTemplatePath(name))) { // 判断路径是否存在
        await downloadTemplate(name)
        const templatePath = createTemplatePath(name)

        await initPackageJson(templatePath, name)
        const initSettings = await inquirer.prompt({
            name: 'init',
            message:' 是否需要自动安装依赖？（默认自动安装)',
            default: true,
            type: 'comfirm'
        })
        const {init} = initSettings
        if(init){
            await installDependencies(templatePath)
        } else {
            console.log(chalk.error('请您自己安装'))
        }

    } else {
        console.error(symbols.error, chalk.red('大兄弟，这个坑有人提前站好了，要不你把他代码删了试试？'))
    }
    
})

commander.parse(process.argv);