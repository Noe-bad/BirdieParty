// Configuration Supabase
const SUPABASE_URL = 'https://atdcuromqxfdxcfjpnqu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGN1cm9tcXhmZHhjZmpwbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTU3MjEsImV4cCI6MjA2NjQzMTcyMX0.4CHv7rvtiRUou9BcS3t1BKbdAegOl8tzXs2iDKYd0fY';

// Initialisation du client Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class GolfTournamentManager {
    constructor() {
        this.tournaments = [];
        this.init();
    }

    async init() {
        // Charger les tournois depuis Supabase
        await this.loadTournaments();
        this.updateStats();
        this.setupEventListeners();
        this.loadPageContent();
    }

    // Charger tous les tournois depuis Supabase
    async loadTournaments() {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erreur lors du chargement des tournois:', error);
                return;
            }

            this.tournaments = data || [];
        } catch (error) {
            console.error('Erreur lors du chargement des tournois:', error);
        }
    }

    updateStats() {
        const tournamentCountEl = document.getElementById('tournament-count');
        const playerCountEl = document.getElementById('player-count');
        
        if (tournamentCountEl) {
            tournamentCountEl.textContent = this.tournaments.length;
        }
        
        if (playerCountEl) {
            const totalPlayers = this.tournaments.reduce((total, tournament) => {
                return total + (tournament.participants ? tournament.participants.length : 0);
            }, 0);
            playerCountEl.textContent = totalPlayers;
        }
    }

    setupEventListeners() {
        // Navigation active state
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    loadPageContent() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch(currentPage) {
            case 'tournois.html':
                this.loadTournamentsPage();
                break;
            case 'creer-tournoi.html':
                this.loadCreateTournamentPage();
                break;
            case 'tournoi.html':
                this.loadTournamentPage();
                break;
        }
    }

    loadTournamentsPage() {
        const tournamentsContainer = document.getElementById('tournaments-container');
        if (!tournamentsContainer) return;

        if (this.tournaments.length === 0) {
            tournamentsContainer.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <h3>Aucun tournoi créé</h3>
                    <p>Commencez par créer votre premier tournoi !</p>
                    <a href="creer-tournoi.html" class="btn btn-success">Créer un tournoi</a>
                </div>
            `;
            return;
        }

        const now = new Date();
        const scheduled = this.tournaments.filter(t => new Date(t.date) > now);
        const ongoing = this.tournaments.filter(t => {
            const tDate = new Date(t.date);
            return tDate <= now && t.status !== 'completed';
        });
        const completed = this.tournaments.filter(t => t.status === 'completed');

        let html = '';

        if (scheduled.length > 0) {
            html += '<h3>Tournois programmés</h3>';
            html += this.renderTournamentCards(scheduled, 'scheduled');
        }

        if (ongoing.length > 0) {
            html += '<h3>Tournois en cours</h3>';
            html += this.renderTournamentCards(ongoing, 'ongoing');
        }

        if (completed.length > 0) {
            html += '<h3>Tournois terminés</h3>';
            html += this.renderTournamentCards(completed, 'completed');
        }

        tournamentsContainer.innerHTML = html;
    }

    renderTournamentCards(tournaments, status) {
        const statusLabels = {
            scheduled: 'Pas encore commencé',
            ongoing: 'En cours',
            completed: 'Terminé'
        };

        return tournaments.map(tournament => `
            <div class="tournament-card" onclick="window.location.href='tournoi.html?id=${tournament.id}'">
                <div class="tournament-header">
                    <h3 class="tournament-title">${tournament.name}</h3>
                    <span class="status-badge status-${status}">${statusLabels[status]}</span>
                </div>
                <div class="tournament-info">
                    <div class="info-item">
                        <span class="info-label">Date</span>
                        <span class="info-value">${new Date(tournament.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Lieu</span>
                        <span class="info-value">${tournament.location}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Format</span>
                        <span class="info-value">${tournament.format}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Participants</span>
                        <span class="info-value">${tournament.participants.length}/${tournament.maxPlayers}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    loadCreateTournamentPage() {
        this.setupCreateTournamentForm();
    }

    setupCreateTournamentForm() {
        const form = document.getElementById('create-tournament-form');
        if (!form) return;

        const holesSelect = document.getElementById('holes');
        const scorecardContainer = document.getElementById('scorecard-container');

        if (holesSelect) {
            holesSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.generateScorecard(parseInt(e.target.value));
                } else {
                    scorecardContainer.innerHTML = '';
                }
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTournament(new FormData(form));
        });

        this.setupParticipantManagement();
    }

    setupParticipantManagement() {
        const addParticipantBtn = document.getElementById('add-participant');
        const participantInput = document.getElementById('participant-name');
        
        if (addParticipantBtn && participantInput) {
            addParticipantBtn.addEventListener('click', () => {
                this.addParticipant();
            });

            participantInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addParticipant();
                }
            });
        }
    }

    addParticipant() {
        const input = document.getElementById('participant-name');
        const list = document.getElementById('participants-list');
        
        if (input.value.trim()) {
            const participantDiv = document.createElement('div');
            participantDiv.className = 'participant-item';
            participantDiv.innerHTML = `
                <span>${input.value.trim()}</span>
                <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Supprimer</button>
            `;
            list.appendChild(participantDiv);
            input.value = '';
        }
    }

    generateScorecard(holes) {
        const container = document.getElementById('scorecard-container');
        
        let html = `
            <h3>Configuration du parcours (${holes} trous)</h3>
            <div class="scorecard">
                <table class="scorecard-table">
                    <thead>
                        <tr>
                            <th>Trou</th>
                            <th>Par</th>
                            <th>Longueur (m)</th>
                            <th>Départ</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (let i = 1; i <= holes; i++) {
            html += `
                <tr>
                    <td>${i}</td>
                    <td>
                        <select name="hole_${i}_par" class="form-select" style="width: 70px;">
                            <option value="3">3</option>
                            <option value="4" selected>4</option>
                            <option value="5">5</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" name="hole_${i}_length" class="form-input" style="width: 100px;" value="350" min="50" max="600">
                    </td>
                    <td>
                        <select name="hole_${i}_tee" class="form-select" style="width: 100px;">
                            <option value="white">Blanc</option>
                            <option value="yellow" selected>Jaune</option>
                            <option value="blue">Bleu</option>
                            <option value="red">Rouge</option>
                        </select>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    async createTournament(formData) {
        const participants = Array.from(document.querySelectorAll('#participants-list .participant-item span'))
            .map(span => span.textContent);

        if (participants.length === 0) {
            alert('Veuillez ajouter au moins un participant');
            return;
        }

        const tournamentData = {
            name: formData.get('name'),
            date: formData.get('date'),
            location: formData.get('location'),
            format: formData.get('format'),
            maxPlayers: parseInt(formData.get('maxPlayers')),
            holes: parseInt(formData.get('holes')),
            rounds: parseInt(formData.get('rounds')),
            participants: participants,
            course: this.getCourseData(formData, parseInt(formData.get('holes'))),
            scores: {},
            status: 'scheduled'
        };

        // Initialize scores for all participants
        participants.forEach(participant => {
            tournamentData.scores[participant] = {};
            for (let round = 1; round <= tournamentData.rounds; round++) {
                tournamentData.scores[participant][round] = new Array(tournamentData.holes).fill(0);
            }
        });

        try {
            const { data, error } = await supabase
                .from('tournaments')
                .insert([tournamentData])
                .select()
                .single();

            if (error) {
                console.error('Erreur lors de la création du tournoi:', error);
                alert('Erreur lors de la création du tournoi');
                return;
            }

            this.tournaments.unshift(data);
            alert('Tournoi créé avec succès !');
            window.location.href = `tournoi.html?id=${data.id}`;
        } catch (error) {
            console.error('Erreur lors de la création du tournoi:', error);
            alert('Erreur lors de la création du tournoi');
        }
    }

    getCourseData(formData, holes) {
        const course = [];
        for (let i = 1; i <= holes; i++) {
            course.push({
                hole: i,
                par: parseInt(formData.get(`hole_${i}_par`)),
                length: parseInt(formData.get(`hole_${i}_length`)),
                tee: formData.get(`hole_${i}_tee`)
            });
        }
        return course;
    }

    async loadTournamentPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const tournamentId = urlParams.get('id');
        
        if (!tournamentId) {
            window.location.href = 'tournois.html';
            return;
        }

        // Charger le tournoi spécifique depuis Supabase
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (error || !data) {
                console.error('Tournoi non trouvé:', error);
                window.location.href = 'tournois.html';
                return;
            }

            this.renderTournamentPage(data);
        } catch (error) {
            console.error('Erreur lors du chargement du tournoi:', error);
            window.location.href = 'tournois.html';
        }
    }

    renderTournamentPage(tournament) {
        document.title = `${tournament.name} - Golf Tournois`;
        
        const container = document.querySelector('.container');
        if (!container) return;

        const leaderboard = this.generateLeaderboard(tournament);
        
        container.innerHTML = `
            <div style="margin: 2rem 0;">
                <h1>${tournament.name}</h1>
                <div class="tournament-info" style="margin: 1rem 0;">
                    <div class="info-item">
                        <span class="info-label">Date</span>
                        <span class="info-value">${new Date(tournament.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Lieu</span>
                        <span class="info-value">${tournament.location}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Format</span>
                        <span class="info-value">${tournament.format}</span>
                    </div>
                </div>
            </div>
            
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2>Classement</h2>
                    <button class="btn btn-primary" onclick="window.golfManager.showScoreEntry('${tournament.id}')">
                        Saisir scores
                    </button>
                </div>
                ${leaderboard}
            </div>
            
            <div id="player-scorecard" class="hidden"></div>
            <div id="score-entry-modal" class="modal hidden"></div>
            <button class="btn btn-info mt-2" onclick="window.golfManager.printScorecards('${tournament.id}')">
                Imprimer les cartes de score
            </button>
            <button class="btn btn-danger mt-2" onclick="window.golfManager.deleteTournament('${tournament.id}')">
                Supprimer ce tournoi
            </button>
            <button class="btn btn-success mt-2 ms-2" onclick="window.golfManager.finishTournament('${tournament.id}')">
                Terminer le tournoi
            </button>

        `;

        this.setupLeaderboardInteraction(tournament);
    }

    generateLeaderboard(tournament) {
        // Formatage des scores au par
        const formatScore = (score) => {
            if (score === null) return '-';    // Non joué
            if (score > 0) return `+${score}`;
            if (score === 0) return 'E';       // Even
            return score.toString();           // score négatif, ex: -3
        };

        const standings = tournament.participants.map(participant => {
            let totalScoreDiff = 0;
            let hasPlayed = false; // Pour détecter s'il a joué au moins un trou

            const roundScoreDiffs = [];

            for (let round = 1; round <= tournament.rounds; round++) {
                const scoresRound = tournament.scores[participant][round];

                // Calculer le score et le par uniquement pour les trous joués
                let roundScore = 0;
                let roundPar = 0;

                scoresRound.forEach((score, index) => {
                    if (score > 0) {
                        roundScore += score;
                        roundPar += tournament.course[index].par;
                    }
                });

                if (roundPar === 0) {
                    // Aucun trou joué pour ce round
                    roundScoreDiffs.push(null);
                } else {
                    hasPlayed = true;
                    const diff = roundScore - roundPar;
                    roundScoreDiffs.push(diff);
                    totalScoreDiff += diff;
                }
            }

            return {
                name: participant,
                rounds: roundScoreDiffs,
                total: hasPlayed ? totalScoreDiff : null
            };
        })
        .sort((a, b) => {
            const aScore = (a.total === null) ? Infinity : a.total;
            const bScore = (b.total === null) ? Infinity : b.total;
            return aScore - bScore;
        });

        let html = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Joueur</th>
        `;

        for (let round = 1; round <= tournament.rounds; round++) {
            html += `<th>Tour ${round}</th>`;
        }

        html += `
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        standings.forEach((player, index) => {
            html += `
                <tr class="leaderboard-row" data-player="${player.name}">
                    <td>${player.total === null ? '-' : index + 1}</td>
                    <td>${player.name}</td>
                    ${player.rounds.map(score => `<td>${formatScore(score)}</td>`).join('')}
                    <td>${formatScore(player.total)}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        return html;
    }

    setupLeaderboardInteraction(tournament) {
        const rows = document.querySelectorAll('.leaderboard-row');
        const scorecardContainer = document.getElementById('player-scorecard');
        
        rows.forEach(row => {
            row.addEventListener('click', () => {
                const playerName = row.dataset.player;
                const playerScores = tournament.scores[playerName];
                const course = tournament.course;
                
                let html = `
                    <div class="scorecard-detail">
                        <h3>Carte de score de ${playerName}</h3>
                        <button class="btn btn-secondary" onclick="document.getElementById('player-scorecard').classList.add('hidden')">
                            Fermer
                        </button>
                `;
                
                for (let round = 1; round <= tournament.rounds; round++) {
                    html += `
                        <h4>Tour ${round}</h4>
                        <table class="scorecard-table">
                            <thead>
                                <tr>
                                    <th>Trou</th>
                                    ${course.map(h => `<th>${h.hole}</th>`).join('')}
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Par</td>
                                    ${course.map(h => `<td>${h.par}</td>`).join('')}
                                    <td>${course.reduce((sum, h) => sum + h.par, 0)}</td>
                                </tr>
                                <tr>
                                    <td>Score</td>
                                    ${playerScores[round].map(s => `<td>${s}</td>`).join('')}
                                    <td>${playerScores[round].reduce((a, b) => a + b, 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    `;
                }
                
                html += `</div>`;
                scorecardContainer.innerHTML = html;
                scorecardContainer.classList.remove('hidden');
            });
        });
    }

    async showScoreEntry(tournamentId) {
        // Récupérer le tournoi depuis Supabase
        try {
            const { data: tournament, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (error || !tournament) {
                console.error('Tournoi non trouvé:', error);
                return;
            }

            const modal = document.getElementById('score-entry-modal');
            
            let html = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Saisir les scores</h3>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').classList.add('hidden')">
                            Fermer
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="score-entry-form">
                            <div class="form-group">
                                <label>Joueur</label>
                                <select id="player-select" class="form-select">
                                    ${tournament.participants.map(p => `<option value="${p}">${p}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tour</label>
                                <select id="round-select" class="form-select">
                                    ${Array.from({length: tournament.rounds}, (_, i) => `<option value="${i+1}">Tour ${i+1}</option>`).join('')}
                                </select>
                            </div>
                            <div id="holes-inputs"></div>
                            <button type="submit" class="btn btn-success">Sauvegarder les scores</button>
                        </form>
                    </div>
                </div>
            `;

            modal.innerHTML = html;
            modal.classList.remove('hidden');

            this.setupScoreEntryForm(tournament);
        } catch (error) {
            console.error('Erreur lors du chargement du tournoi:', error);
        }
    }

    setupScoreEntryForm(tournament) {
        const playerSelect = document.getElementById('player-select');
        const roundSelect = document.getElementById('round-select');
        const holesContainer = document.getElementById('holes-inputs');
        const form = document.getElementById('score-entry-form');

        // Fonction qui met à jour l'affichage des inputs de score
        const updateHolesInputs = () => {
            const player = playerSelect.value;
            const round = parseInt(roundSelect.value);
            const currentScores = tournament.scores[player][round];

            const holesCount = tournament.holes;
            const half = Math.floor(holesCount / 2);

            const renderTable = (start, end, label) => {
                let html = `
                    <h4 style="margin-top: 1rem;">${label}</h4>
                    <table class="scorecard-table" style="margin-bottom: 2rem;">
                        <thead>
                            <tr>
                                <th>Trou</th>
                                ${tournament.course.slice(start, end).map(h => `<th>${h.hole}</th>`).join('')}
                                <th>Total</th>
                            </tr>
                            <tr>
                                <th>Par</th>
                                ${tournament.course.slice(start, end).map(h => `<th>${h.par}</th>`).join('')}
                                <th>${tournament.course.slice(start, end).reduce((sum, h) => sum + h.par, 0)}</th>
                            </tr>
                            <tr>
                                <th>Longueur (m)</th>
                                ${tournament.course.slice(start, end).map(h => `<th>${h.length}</th>`).join('')}
                                <th>-</th>
                            </tr>
                            <tr>
                                <th>Départ</th>
                                ${tournament.course.slice(start, end).map(h => `<th>${h.tee.charAt(0).toUpperCase() + h.tee.slice(1)}</th>`).join('')}
                                <th>-</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th>Score</th>
                `;

                let totalScore = 0;

                for (let i = start; i < end; i++) {
                    const score = currentScores[i] || 0;
                    if (score > 0) totalScore += score;

                    html += `
                        <td>
                            <input type="number" 
                                   name="hole_${i + 1}" 
                                   value="${score === 0 ? '' : score}" 
                                   min="1" max="15" 
                                   class="form-input" 
                                   style="width: 50px; text-align: center; -moz-appearance: textfield; -webkit-appearance: none; margin: 0;">
                        </td>
                    `;
                }

                html += `
                                <th>${totalScore === 0 ? '-' : totalScore}</th>
                            </tr>
                        </tbody>
                    </table>
                `;
                return html;
            };

            let html = '';

            if (holesCount === 18) {
                html += renderTable(0, 9, "Aller");
                html += renderTable(9, 18, "Retour");
            } else {
                html += renderTable(0, holesCount, "Parcours");
            }

            holesContainer.innerHTML = `<div>${html}</div>`;
        };

        playerSelect.addEventListener('change', updateHolesInputs);
        roundSelect.addEventListener('change', updateHolesInputs);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const player = playerSelect.value;
            const round = parseInt(roundSelect.value);
            const formData = new FormData(form);

            for (let hole = 1; hole <= tournament.holes; hole++) {
                const score = parseInt(formData.get(`hole_${hole}`)) || 0;
                tournament.scores[player][round][hole - 1] = score;
            }

            await this.saveTournament(tournament);
            this.renderTournamentPage(tournament);
            document.getElementById('score-entry-modal').classList.add('hidden');
        });

        updateHolesInputs();
    }

    async saveTournament(tournament) {
        try {
            const { error } = await supabase
                .from('tournaments')
                .update({
                    scores: tournament.scores,
                    status: tournament.status
                })
                .eq('id', tournament.id);

            if (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                alert('Erreur lors de la sauvegarde des scores');
                return false;
            }

            // Mettre à jour le tournoi dans la liste locale
            const index = this.tournaments.findIndex(t => t.id === tournament.id);
            if (index !== -1) {
                this.tournaments[index] = tournament;
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde des scores');
            return false;
        }
    }

    async deleteTournament(tournamentId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce tournoi ?')) {
            try {
                const { error } = await supabase
                    .from('tournaments')
                    .delete()
                    .eq('id', tournamentId);

                if (error) {
                    console.error('Erreur lors de la suppression:', error);
                    alert('Erreur lors de la suppression du tournoi');
                    return;
                }

                // Supprimer de la liste locale
                this.tournaments = this.tournaments.filter(t => t.id !== tournamentId);
                window.location.href = 'tournois.html';
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                alert('Erreur lors de la suppression du tournoi');
            }
        }
    }

    async printScorecards(tournamentId) {
    const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

    if (error || !tournament) {
        alert('Erreur lors du chargement du tournoi');
        return;
    }

    const win = window.open('', '_blank');

    const courseHeaders = tournament.course.map(h => `<th>${h.hole}</th>`).join('');
    const coursePar = tournament.course.map(h => `<td>${h.par}</td>`).join('');
    const courseLength = tournament.course.map(h => `<td>${h.length}m</td>`).join('');
    const courseTee = tournament.course.map(h => {
        const colorsFr = {
            white: "Blanc",
            yellow: "Jaune",
            blue: "Bleu",
            red: "Rouge"
        };
        return `<td>${colorsFr[h.tee] || h.tee}</td>`;
    }).join('');
    const parTotal = tournament.course.reduce((sum, h) => sum + h.par, 0);

    let html = `
        <html><head>
        <title>Cartes de score - ${tournament.name}</title>
        <style>
            :root {
                --primary-blue: #003366;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            body {
                font-family: sans-serif;
                margin: 0;
                padding: 0;
            }
            
            .scorecard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .scorecard-logo {
                width: 60px;
                height: auto;
            }

            .page {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                page-break-after: always;
                padding: 1.5cm;
                box-sizing: border-box;
                gap: 0.5rem;
            }

            .scorecard {
                border: 2px solid #000;
                padding: 10px;
                box-sizing: border-box;
            }

            .scorecard h2 {
                font-size: 18px;
                margin: 0 0 6px 0;
            }

            .scorecard p {
                font-size: 13px;
                margin: 3px 0;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-top: 10px;
            }

            th, td {
                border: 1px solid #000;
                padding: 6px;
                text-align: center;
                height: 28px;
            }

            thead th,
            tbody tr:not(:last-child) td {
                background-color: var(--primary-blue);
                color: white;
            }

            /* Ligne Score - blanche pour écriture */
            tbody tr:last-child td {
                background-color: white !important;
                color: black !important;
            }

            .signatures {
                margin-top: 20px;
                font-size: 12px;
                display: flex;
                justify-content: space-between;
            }

            .signatures span {
                display: inline-block;
                width: 48%;
                border-top: 1px solid #000;
                padding-top: 4px;
                text-align: center;
            }

            @media print {
                body {
                    margin: 0;
                }
            }
        </style>
        </head><body>
    `;

    let counter = 0;
    let pageGroup = '';

    tournament.participants.forEach(player => {
        for (let round = 1; round <= tournament.rounds; round++) {
            if (counter % 4 === 0) {
                if (pageGroup) {
                    html += `<div class="page">${pageGroup}</div>`;
                }
                pageGroup = '';
            }

            pageGroup += `
                <div class="scorecard">
                    <div class="scorecard-header">
                        <h2>${tournament.name}</h2>
                        <img src="logo-birdieparty.png" alt="BirdieParty Logo" class="scorecard-logo">
                    </div>
                    <p><strong>Joueur :</strong> ${player}</p>
                    <p><strong>Tour :</strong> ${round}</p>
                    <p><strong>Date :</strong> ${new Date(tournament.date).toLocaleDateString('fr-FR')}</p>
                    <table>
                        <thead>
                            <tr><th>Trou</th>${courseHeaders}<th>Total</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Par</td>${coursePar}<td>${parTotal}</td></tr>
                            <tr><td>Longueur</td>${courseLength}<td>-</td></tr>
                            <tr><td>Départ</td>${courseTee}<td>-</td></tr>
                            <tr><td>Score</td>${tournament.course.map(() => `<td></td>`).join('')}<td></td></tr>
                        </tbody>
                    </table>
                    <div class="signatures">
                        <span>Signature du joueur</span>
                        <span>Signature du marqueur</span>
                    </div>
                </div>
            `;

            counter++;
        }
    });

    if (pageGroup) {
        html += `<div class="page">${pageGroup}</div>`;
    }

    html += `</body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
}


async finishTournament(tournamentId) {
    if (!confirm("Êtes-vous sûr de vouloir terminer ce tournoi ? Une fois terminé, il ne pourra plus être modifié.")) {
        return;
    }

    const { data, error } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId)
        .select()
        .single();

    if (error) {
        alert("Erreur lors de la terminaison du tournoi.");
        console.error(error);
        return;
    }

    alert("Le tournoi a été terminé avec succès.");
    window.location.reload();
}


}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    window.golfManager = new GolfTournamentManager();
});





