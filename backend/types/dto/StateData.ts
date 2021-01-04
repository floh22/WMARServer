/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable quotes */
import Note from "../containers/Note";
import ObjectConfig from "../containers/ObjectConfig";

export class StateData {

  objectConfig = new ObjectConfig('none');
  host = '';
  sessionName = '';
  id = -1;
  notes: Array<Note> = [];
  //config = new Config();


  toJSON(): any {
    const noteIds: number[] = [];
    this.notes.forEach((n) => noteIds.push(n.id || 0));
    return { objectConfig: this.objectConfig, host: this.host, sessionName: this.sessionName, id: this.id, notes: noteIds };
  }


  /*
  leagueConnected = false;
  champSelectActive = false;
  blueTeam = new Team();
  redTeam = new Team();
  meta = new Meta();
  timer = 0;
  state = "PICK 1";
  config = new Config();
  

  getCurrentAction() {
    // If either team is active, return none
    if (!this.blueTeam.isActive && !this.redTeam.isActive) {
      return {
        state: "none",
      };
    }

    // If both teams are active, return none
    if (this.blueTeam.isActive && this.redTeam.isActive) {
      return {
        state: "none",
      };
    }

    // get the active team
    const activeTeam = this.blueTeam.isActive ? this.blueTeam : this.redTeam;
    const activeTeamName = this.blueTeam.isActive ? "blueTeam" : "redTeam";

    const activeBans = activeTeam.bans.filter((ban) => ban.isActive);
    const activePicks = activeTeam.picks.filter((pick) => pick.isActive);

    if (activeBans.length > 0) {
      return {
        state: "ban",
        data: activeBans[0],
        team: activeTeamName,
        num: activeTeam.bans.indexOf(activeBans[0]),
      };
    }

    if (activePicks.length > 0) {
      return {
        state: "pick",
        data: activePicks[0],
        team: activeTeamName,
        num: activeTeam.picks.indexOf(activePicks[0]),
      };
    }
  }

  refreshAction(action: any) {
    if (action.state === "none") {
      return action;
    }

    const team = action.team === "blueTeam" ? this.blueTeam : this.redTeam;

    const array = action.state === "ban" ? team.bans : team.picks;

    return {
      ...action,
      data: array[action.num],
    };
  }
  */

}
