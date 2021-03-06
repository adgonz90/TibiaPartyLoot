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
        party = extractMatchLSB(partyMatch);

        const people = [];
        const personMatches = partyHuntAnalyzerText.matchAll(/(?<name>[\w-' ]+)(?: \(Leader\))?\n\tLoot: (?<loot>[\d,-]+)\n\tSupplies: (?<supplies>[\d,-]+)\n\tBalance: (?<balance>[\d,-]+)/g);
        for (const personMatch of personMatches) {
            const person = extractMatchLSB(personMatch);
            person.name = personMatch.groups.name;
            person.kept_loot = false;

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

    const analyzeParty = () => {
        party.perPersonProfit = Math.floor(party.balance / party.size);
        party.splits = [];

        for (const person of party.people) {
            person.split = party.perPersonProfit + person.supplies - (person.kept_loot ? person.loot : 0);
            party.splits.push(person.name + ': ' + person.split);
        }

        return party;
    };

    const refreshHtml = () => {
        var personHtmlRows = '';
        var index = 0;
        for (const person of party.people) {
            personHtmlRows += `
              <tr ${person.split < 0 ? 'class="table-danger"' : ''}>
                <td><input type="text" class="form-control-plaintext" name="person[${index}][name]" value="${person.name}" disabled></td>
                <td><div class="input-group">
                  <input type="text" class="form-control-plaintext" name="person[${index}][loot]" value="${person.loot}" disabled>
                  <div class="input-group-append">
                    <div class="input-group-text">
                      Keep?&nbsp
                      <input type="checkbox" name="person[${index}][kept_loot]" ${person.kept_loot ? 'checked' : ''}>
                    </div>
                  </div>
                </div></td>
                <td><input type="text" class="form-control-plaintext" name="person[${index}][supplies]" value="${person.supplies}" disabled></td>
                <td><div class="input-group">
                  <input type="text" class="form-control-plaintext" name="person[${index}][split]" value="${person.split}" disabled>
                  <div class="input-group-append">
                    <button class="btn btn-outline-secondary" type="button" data-copy="transfer ${person.split} to ${person.name}" ${person.split < 0 ? 'disabled' : ''}>Copy</button>
                  </div>
                </div></td>
              </tr>`;
            index++;
        }

        html =`
            <ul>
              <li>Party Size: <b>${formatNumber(party.size)}</b></li>
              <li>Party Loot: <b>${formatNumber(party.loot)} gp</b></li>
              <li>Party Supplies: <b>${formatNumber(party.supplies)} gp</b></li>
              <li>Party Balance: <b>${formatNumber(party.balance)} gp</b></li>
              <li>Balance per person: <b>${formatNumber(party.perPersonProfit)} gp</b></li>
            </ul>
            <form class="form-inline">
            <table class="table-striped">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Loot</th>
                  <th>Supplies</th>
                  <th><span class="float-left">Split</span><span class="float-right"><button class="btn btn-outline-dark btn-sm p-1" type="button" data-copy="${party.splits.join(" \\ ")}">Copy</button></span></th>
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


            $(":input[name^=person]").on('input', function() {
                personFormControlMatches = this.name.match(/person\[(?<index>[\d]+)\]\[(?<field>[\w_]+)\]/);
                person = party.people[personFormControlMatches.groups.index];
                person[personFormControlMatches.groups.field] = (this.type === 'checkbox' ? this.checked : this.value);

                analyzeParty();
                refreshHtml();
            });
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
            outputEl.innerHTML = `Error: failed to parse input. Please go to the Tibia client, copy the output from the in-game “party hunt analyser”, and paste it into the input field.`
        }
    });

})();