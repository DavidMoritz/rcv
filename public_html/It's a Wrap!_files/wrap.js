class Wrap {
	constructor() {
		const getNumber = (query, check) => {
			const newNum = Number(document.querySelector(`[name=${query}]${check ? ":checked" : ""}`).value);

			if(!check) {
  			document.documentElement.style.setProperty(`--${query}`, `${newNum * 10}px`);
			}

			return newNum
		};

		this.height = getNumber("height");
		this.length = getNumber("length");
		this.depth = getNumber("depth");
		this.roll = getNumber("roll-length", true);
		this.buffer = 1;
	}
	get longest() {
		return Math.max(this.height, this.length, this.depth);
	}
	get shortest() {
		return Math.min(this.height, this.length, this.depth);
	}
	get waist() {
		return 2 * (this.height + this.length + this.depth - this.longest);
	}
	get cape() {
		return this.longest + this.shortest;
	}
	get amount() {
		const maxLength = Math.max(this.cape, this.waist) + this.buffer;
		const minLength = Math.min(this.cape, this.waist) + this.buffer;

		if(maxLength <= this.roll) {
			return minLength;
		} else if (minLength <= this.roll) {
			return maxLength;
		} else if (maxLength / 2 <= this.roll) {
			return minLength * 2 - this.buffer;
		} else {
			return "\"Too large for this roll";
		}
	}
	get ribbon() {
		return Math.min(this.cape, this.waist) + this.buffer + 10;
	}
}

function calculateTotal() {
	const wrap = new Wrap();
	const foot = wrap.amount > 23 ? "feet" : "foot";
	const inch = wrap.amount % 12 === 1 ? "inch" : "inches";
	let result = `<span class="unit">${wrap.amount}"</span>`;

	if(wrap.amount > 12) {
// 		result += ` <span class="parse">(${parseInt(wrap.amount/12)} ${foot} - ${wrap.amount%12} ${inch})</span>`;
		result += ` <span class="parse"><br>(${parseInt(wrap.amount/12)} ${foot} - ${wrap.amount%12}")</span>`;
	}

	document.querySelector("#result").innerHTML = result;

	const ribFoot = wrap.ribbon > 23 ? "feet" : "foot";
	const ribInch = wrap.ribbon % 12 === 1 ? "inch" : "inches";
	let ribResult = `<span class="unit">${wrap.ribbon}"</span>`;

	if(wrap.ribbon > 12) {
// 		ribResult += ` <span class="parse">(${parseInt(wrap.ribbon/12)} ${ribFoot} - ${wrap.ribbon%12} ${ribInch})</span>`;
		ribResult += ` <span class="parse"><br>(${parseInt(wrap.ribbon/12)} ${ribFoot} - ${wrap.ribbon%12}")</span>`;
	}

	document.querySelector("#ribbon-result").innerHTML = ribResult;
}

function switchUnits() {
	if(document.body.className === "cm-unit") {
		document.body.className = "";
	} else {
		document.body.className = "cm-unit";
	}
}

function clickButton(e) {
	const attr = e.currentTarget.getAttribute("for");
	const targetClass = e.target.className;
	const input = document.querySelector(`[name=${attr}]`);
	let val = Number(input.value);

	if(targetClass.indexOf("plus") >= 0) {
		val += targetClass.indexOf("double") >= 0 ? 5 : 1;
	} else if(targetClass.indexOf("minus") >= 0) {
		val -= targetClass.indexOf("double") >= 0 ? 5 : 1;
	}

	input.value = Math.max(0, val);
	calculateTotal();
}

function on(event, selector, func, delay) {
	document.querySelectorAll(selector).forEach(el => {
		el.addEventListener(event, func);
	});
}

on("input", "input", calculateTotal);
on("change", "input", calculateTotal);
on("click", ".js-roll", () => {
	setTimeout(calculateTotal, 0);
});
on("click", ".input-group", clickButton);
on("click", ".title", switchUnits);

on("click", ".rotate-right", rotateRight);
on("click", ".rotate-left", rotateLeft);
on("click", ".rotate-stop", rotateStop);

// window.screen.lockOrientation("portrait");
window.rotateValue = 212;
window.rotateDirection = 0;

setInterval(() => {
	window.rotateValue += window.rotateDirection;
	document.documentElement.style.setProperty(`--rotate`, `${window.rotateValue}deg`);
}, 30)

function rotateRight() {
	window.rotateDirection = 1;
}

function rotateLeft() {
	window.rotateDirection = -1;
}

function rotateStop() {
	window.rotateDirection = 0;
}

const inputs = document.querySelectorAll('.dem');

// listen for changes
inputs.forEach(input => input.addEventListener('input', update));

function update(e) {
  let px = this.id == "rotate" ? 'deg' : 'px'
  document.documentElement.style.setProperty(`--${this.id}`, `${this.value}deg`);
}
