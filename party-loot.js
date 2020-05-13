(() => {

	const copyText = (text) => {
		const input = document.createElement('input');
		input.value = text;
		input.focus();
		document.body.append(input);
		input.select();
		document.execCommand('copy');
		input.remove();
	};

	const parseNumber = (string) => {
		return Number(string.replace(/,/g, ''));
	};

	const extractMatchLSB = (match) => {
		const loot = parseNumber(match.groups.loot);
		const supplies = parseNumber(match.groups.supplies);
		const balance = parseNumber(match.groups.balance);

		return {
			loot: loot,
			supplies: supplies,
			balance: balance
		};
	}

	const extractData = (input) => {
		const partyMatch = input.match(/Loot: (?<loot>[\d,-]+)\nSupplies: (?<supplies>[\d,-]+)\nBalance: (?<balance>[\d,-]+)/);
		const party = extractMatchLSB(partyMatch);

		const people = [];
		const personMatches = input.matchAll(/(?<name>[\w-' ]+)(?: \(Leader\))?\n\tLoot: (?<loot>[\d,-]+)\n\tSupplies: (?<supplies>[\d,-]+)\n\tBalance: (?<balance>[\d,-]+)/g);
		for (const personMatch of personMatches) {
			const person = extractMatchLSB(personMatch);
			person.name = personMatch.groups.name;

			people.push(person);
		}

		party.people = people;
		party.size = people.length

		return party
	};

	const nf = new Intl.NumberFormat('en');
	const formatNumber = (number) => {
		return nf.format(number);
	};

	const analyzeData = (input) => {
		const party = extractData(input);

		party.perPersonProfit = Math.floor(party.balance / party.size);

		for (const person of party.people) {
			person.split = person.supplies + party.perPersonProfit;
		}

		return party;
	};

	const input = document.getElementById('party-loot-input')
	const output = document.getElementById('party-loot-output')

	input.addEventListener('input', () => {
		try {
			const party = analyzeData(input.value.trim());
			const splits = [];
			const lines = [];
			for (const person of party.people) {
				splits.push(`${person.name}: ${formatNumber(person.split)}`)
				lines.push(`<li data-copy="transfer ${person.split} to ${person.name}" title="Click to copy bank NPC transfer text"><b>${formatNumber(person.split)} gp</b> to ${person.name}.</li>`)
			}
			lines.push(`<li>Total balance: <b>${formatNumber(party.balance)} gp</b></li>`);
			lines.push(`<li>Number of people: <b>${formatNumber(party.size)}</b></li>`);
			lines.push(`<li>Balance per person: <b>${formatNumber(party.perPersonProfit)} gp</b></li>`);

			const splitLine = splits.join(' / ');
			lines.push(`<li data-copy="${splitLine}" title="Click to copy split line">Split: <b>${splitLine}</b></li>`);
			const html = `<ul>${ lines.join('') }</ul>`;
			input.classList.remove('error');
			output.innerHTML = html;
		} catch (e) {
			console.log(e)
			input.classList.add('error');
			output.innerHTML = `Error: failed to parse input. Please go to the Tibia client, copy the output from the in-game “party hunt analyser”, and paste it into the input field.`
		}
	});

	output.addEventListener('click', (event) => {
		const target = event.target
		if (target.matches('li[data-copy]')) {
			copyText(target.dataset.copy)
		}
	});

})();