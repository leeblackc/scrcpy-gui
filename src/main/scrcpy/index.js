const debug = require('debug')('scrcpy')
const fixPath = require('fix-path')
fixPath()
const open = ({sender}, options) => {
	const args = []
	const {config, devices} = options
	const {record, screen, fixed, control, touch, render, activeDeivies, colNum, rowNum, screenWidth, screenHeight, bitRate, maxSize, crop} = config
	const {open, openMirror, filepath} = record
	const {x, y, height, width} = crop

	const windowWidth = parseInt(screenWidth / colNum)
	const windowHeight = parseInt((screenHeight - 100) / rowNum)
	var colUse = 0
	var rowUse = 0

	if (open) {
		if (!openMirror) {
			args.push('--no-display')
		}
		args.push('--record')
		args.push(filepath)
	}
	if (screen) {
		args.push('--turn-screen-off')
	}
	if (fixed) {
		args.push('--always-on-top')
	}
	if (!control) {
		args.push('--no-control')
	}
	if (touch) {
		args.push('--show-touches')
	}
	if (render) {
		args.push('--render-expired-frames')
	}
	if (bitRate !== 8) {
		args.push('--bit-rate')
		args.push(`${bitRate}M`)
	}
	if (maxSize !== 0) {
		args.push('--max-size')
		args.push(`${maxSize}`)
	}
	if (height !== 0 || width !== 0) {
		args.push('--crop')
		args.push(`${height}:${width}:${x}:${y}`)
	}
	args.push('--window-width')
	args.push(windowWidth)
	args.push('--window-height')
	args.push(windowHeight)
	// console.log(devices);
	devices.forEach(({id, name}) => {
			args.push('--window-title')
			args.push(name)

			if (colNum > colUse) {
				args.push('--window-x')
				args.push(windowWidth * colUse)
				args.push('--window-y')
				args.push(windowHeight * rowUse + 30)
				colUse++
			} else {
				colUse = 0
				rowUse++
				if (rowUse >= rowNum) {
					console.log(`The screen is full of windows `)
					return
				}
				args.push('--window-x')
				args.push(windowWidth * colUse)
				args.push('--window-y')
				args.push(windowHeight * rowUse + 60)
			}
			const {spawn} = require('child_process')
			const scrcpy = spawn('scrcpy', [...args, '-s', `${id}`])
			// console.log(id + `:` + scrcpy.pid + ` start`)
			let opened = false
			let exited = false
			scrcpy.stdout.on('data', (data) => {
				if (!opened) {
					sender.send('open', id)
					opened = true
				}
				console.log(`stdout: ${data}`)
				if ((data.toString().trim().indexOf('Exception') !== -1) || (data.toString().trim().indexOf('at') !== -1)) {
					console.log('Exception happended');
					sender.send('offlineDeviceId', {'deviceId': id, 'processId': scrcpy.pid})
					opened = false
					scrcpy.kill()
				}
			})

			sender.send('activeDeviceId', {'deviceId': id, 'processId': scrcpy.pid})

			scrcpy.on('error', (code) => {
				console.log(id + `:` + scrcpy.pid + ` child process close all stdio with code ${code}`)
				sender.send('close', {success: code === 0, id})
				sender.send('offlineDeviceId', {'deviceId': id, 'processId': scrcpy.pid})
				scrcpy.kill()
				// opened = false
			})


			scrcpy.on('close', (code) => {
				console.log(id + `:` + scrcpy.pid + ` child process close all stdio with code ${code}`)
				// scrcpy.kill()
			})

			scrcpy.on('exit', (code) => {
				console.log(id + `:` + scrcpy.pid + ` child process exited with code ${code}`)
				if (!exited) {
					sender.send('close', {success: code === 0, id})
					sender.send('offlineDeviceId', {'deviceId': id, 'processId': scrcpy.pid})
					scrcpy.kill()
					exited = true
					// opened = false
				}
			})
		}
	)
// sender.send('activeDevices',activeDeivies)
}


export default {
	open
}
