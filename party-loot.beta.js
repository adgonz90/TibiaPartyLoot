var party;
(() => {
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

    const extractPartyData = (partyHuntAnalyzerText) => {
        const partyMatch = partyHuntAnalyzerText.match(/Loot: (?<loot>[\d,-]+)\nSupplies: (?<supplies>[\d,-]+)\nBalance: (?<balance>[\d,-]+)/);
        party = {
            original: extractMatchLSB(partyMatch),
        }

        const people = [];
        const personMatches = partyHuntAnalyzerText.matchAll(/(?<name>[\w-' ]+)(?: \(Leader\))?\n\tLoot: (?<loot>[\d,-]+)\n\tSupplies: (?<supplies>[\d,-]+)\n\tBalance: (?<balance>[\d,-]+)/g);
        for (const personMatch of personMatches) {
            const person = extractMatchLSB(personMatch);
            person.name = personMatch.groups.name;
            person.kept_loot = false;
            person.ignored = false;
            person.waste_only = false;

            people.push(person);
        }

        party.people = people;
        party.original.size = people.length

        return party
    };

    const nf = new Intl.NumberFormat('en');
    const formatNumber = (number) => {
        return nf.format(number);
    };

    const analyzeParty = () => {
        party.calculated = {
            loot: 0,
            supplies: 0,
            size: 0,
            people_sharing_profit: 0,
            debug: {
                loot: 0
            }
        };
        for (const person of party.people) {
            if (person.ignored) {
                person.kept_loot = false;
                person.waste_only = false;
            }
            else {
                party.calculated.loot += person.loot;
                party.calculated.supplies += person.supplies;
                party.calculated.size += 1;
                party.calculated.people_sharing_profit += person.waste_only ? 0 : 1;
            }
        }

        party.calculated.balance = party.calculated.loot - party.calculated.supplies;
        party.calculated.perPersonProfit = Math.floor(party.calculated.balance / party.calculated.people_sharing_profit);

        party.original.perPersonProfit = Math.floor(party.original.balance / party.original.size);
        party.splitText = [];

        for (const person of party.people) {
            person.split = person.ignored ? 0 : 
                (party.calculated.perPersonProfit < 0 ? 
                    (Math.floor(party.calculated.loot * (person.supplies / party.calculated.supplies))) - (person.kept_loot ? person.loot : 0) :
                    ((person.waste_only ? 0 : party.calculated.perPersonProfit) + person.supplies - (person.kept_loot ? person.loot : 0)));
            party.calculated.debug.loot += person.split;

            if (!person.ignored) party.splitText.push(person.name + ': ' + person.split);
        }
        return party;
    };

    const refreshHtml = () => {
        var personHtmlRows = '';
        var index = 0;
        for (const person of party.people) {
            personHtmlRows += `
              <tr ${person.split < 0 ? 'class="table-danger"' : ''}>
                <td><div class="input-group">
                  <input type="text" class="form-control-plaintext" data-type="string" name="person[${index}][name]" value="${person.name}" ${person.ignored ? 'disabled' : ''}>
                  <div class="input-group-append">
                    <div class="input-group-text">
                      I&nbsp
                      <input type="checkbox" data-type="boolean" name="person[${index}][ignored]" ${person.ignored ? 'checked' : ''}>
                    </div>
                  </div>
                </div></td>
                <td><div class="input-group">
                  <input type="text" class="form-control-plaintext" data-type="number" name="person[${index}][loot]" value="${person.loot}" ${person.ignored ? 'disabled' : ''}>
                  <div class="input-group-append">
                    <div class="input-group-text">
                      K&nbsp
                      <input type="checkbox" data-type="boolean" name="person[${index}][kept_loot]" ${person.kept_loot ? 'checked' : ''} ${person.ignored ? 'disabled' : ''}>
                    </div>
                  </div>
                </div></td>
                <td><div class="input-group">
                  <input type="text" class="form-control-plaintext" data-type="number" name="person[${index}][supplies]" value="${person.supplies}" ${person.ignored ? 'disabled' : ''}>
                  <div class="input-group-append">
                    <div class="input-group-text">
                      W&nbsp
                      <input type="checkbox" data-type="boolean" name="person[${index}][waste_only]" ${person.waste_only ? 'checked' : ''} ${person.ignored ? 'disabled' : ''}>
                    </div>
                  </div>
                </div></td>
                <td><div class="input-group">
                  <input type="text" class="form-control-plaintext" data-type="number" name="person[${index}][split]" value="${person.split}" disabled>
                  <div class="input-group-append">
                    <button class="btn btn-outline-secondary" type="button" data-copy="transfer ${person.split} to ${person.name}" ${person.split < 0 || person.ignored ? 'disabled' : ''}>Copy</button>
                  </div>
                </div></td>
              </tr>`;
            index++;
        }

        html =`
            <div class="container">
              <div class="row">
                <div class="col-sm">
                  <h5>Original Party Details</h5>
                  <ul>
                    <li>Party Size: <b>${formatNumber(party.original.size)}</b></li>
                    <li>Party Loot: <b>${formatNumber(party.original.loot)} gp</b></li>
                    <li>Party Supplies: <b>${formatNumber(party.original.supplies)} gp</b></li>
                    <li>Party Balance: <b>${formatNumber(party.original.balance)} gp</b></li>
                    <li>Profit per person: <b>${formatNumber(Math.max(party.original.perPersonProfit, 0))} gp</b></li>
                  </ul>
                </div>
                <div class="col-sm">
                  <h5>Modified Party Details</h5>
                  <ul>
                    <li>Party Size: <b>${formatNumber(party.calculated.size)}</b></li>
                    <li>Party Loot: <b>${formatNumber(party.calculated.loot)} gp</b></li>
                    <li>Party Supplies: <b>${formatNumber(party.calculated.supplies)} gp</b></li>
                    <li>Party Balance: <b>${formatNumber(party.calculated.balance)} gp</b></li>
                    <li>Profit per person: <b>${formatNumber(Math.max(party.calculated.perPersonProfit, 0))} gp</b></li>
                  </ul>
                </div>
              </div>
            </div>
            <form class="form-inline">
              <table class="table-striped">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Loot</th>
                    <th>Supplies</th>
                    <th><span class="float-left">Split</span><span class="float-right"><button class="btn btn-outline-dark btn-sm p-1" type="button" data-copy="${party.splitText.join(" \\ ")}">Copy Split Line</button></span></th>
                  </tr>
                  </thead>
                  <tbody>
                    ${personHtmlRows}
                    <input type="hidden" class="form-control" name="people_count" value="${index}">
                  </tbody>
              </table>
            </form>`;

        outputEl.html(html)

        $(":button[data-copy]").click(function() {
            copyButton = this;
            copyEl.val(copyButton.dataset.copy);
            copyEl.focus();
            copyEl.select();
            document.execCommand('copy');
            copyButton.style.backgroundColor = '#4BB543';
            setTimeout(function () {
                copyButton.style.backgroundColor = '';
            }, 3000);
        });


        $(":input:text[name^=person]").on('blur', function() {
            updateParty(this);
        });
        $(":input:checkbox[name^=person]").on('input', function() {
            updateParty(this);
        });
    }

    const updateParty = (input) => {
        personFormControlMatches = input.name.match(/person\[(?<index>[\d]+)\]\[(?<field>[\w_]+)\]/);
        person = party.people[personFormControlMatches.groups.index];
        person[personFormControlMatches.groups.field] = (input.type === 'checkbox' ? input.checked : input.dataset.type === 'number' && !isNaN(input.value) ? parseInt(input.value) : input.value);

        console.log(party);

        analyzeParty();
        refreshHtml();
    }


    const outputEl = $('#party-results');
    const copyEl = $('#hidden-copy');

    $('#party-hunt-analyzer').on('input', function () {
        try {
            extractPartyData(this.value.trim());
            analyzeParty();
            refreshHtml();
        } catch (e) {
            console.log(e)
            this.classList.add('error');
            outputEl.innerHTML = 'Error: failed to parse input. Please go to the Tibia client, copy the output from the in-game “party hunt analyser”, and paste it into the input field.'
        }
    });

})();