import { ParameterMappings, getParam, getPosition } from '../Utils/ParameterMappings.js';

const PM = ParameterMappings.NewCharacter;
const PM_HEALTH = ParameterMappings.HealthUpdate;
const PM_EQUIP = ParameterMappings.CharacterEquipmentChanged;
const PM_MOUNT = ParameterMappings.Mounted;

class Player {
  constructor(
    posX,
    posY,
    id,
    nickname,
    guildName1,
    currentHealth,
    initialHealth,
    items,
    flagId,
    alliance
  ) {
    this.posX = posX;
    this.posY = posY;
    this.oldPosX = posX;
    this.oldPosY = posY;
    this.id = id;
    this.nickname = nickname;
    this.guildName = guildName1;
    this.alliance = alliance;
    this.hX = 0;
    this.hY = 0;
    this.currentHealth = currentHealth;
    this.initialHealth = initialHealth;
    this.items = items;
    this.flagId = flagId;
    this.mounted = false;
  }

  setMounted(mounted) {
    this.mounted = mounted;
  }
}

export class PlayersHandler {
  constructor(settings) {
    this.playersInRange = [];
    this.localPlayer = new Player();
    this.invalidate = false;

    this.settings = settings;

    this.filteredPlayers = [];
    this.filteredGuilds = [];
    this.filteredAlliances = [];

    this.alreadyFilteredPlayers = [];

    this.settings.ignoreList.forEach((element) => {
      const name = element["Name"];

      switch (element["Type"]) {
        case "Player":
          this.filteredPlayers.push(name);
          break;

        case "Guild":
          this.filteredGuilds.push(name);
          break;

        case "Alliance":
          this.filteredAlliances.push(name);
          break;

        default: // Default is player
          this.filteredPlayers.push(name);
          break;
      }
    });
  }

  getPlayersInRange() {
    try {
      return [...this.playersInRange]; // Create a copy of the array
    } finally {}
  }

  updateItems(id, Parameters) {
    const items = getParam(Parameters, PM_EQUIP.items, null, 'CharacterEquipmentChanged');

    if (items != null) {
      this.playersInRange.forEach((playerOne) => {
        if (playerOne.id === id) {
          playerOne.items = items;
        }
      });
    }
  }

  handleNewPlayerEvent(Parameters) {
    if (!this.settings.settingOnOff) return;

    /* General */
    const id = getParam(Parameters, PM.id, null, 'NewCharacter');
    const nickname = getParam(Parameters, PM.nickname, null, 'NewCharacter');

    if (id == null || nickname == null) {
      console.warn('[PlayersHandler] Missing id or nickname in NewCharacter event');
      return;
    }

    if (this.alreadyFilteredPlayers.find((name) => name === nickname.toUpperCase())) return;

    if (this.filteredPlayers.find((name) => name === nickname.toUpperCase())) {
      this.alreadyFilteredPlayers.push(nickname.toUpperCase());
    }

    const guildName = String(getParam(Parameters, PM.guildName, '', 'NewCharacter'));

    if (this.filteredGuilds.find((name) => name === guildName.toUpperCase())) {
      this.alreadyFilteredPlayers.push(nickname.toUpperCase());
    }

    const alliance = String(getParam(Parameters, PM.alliance, '', 'NewCharacter'));

    if (this.filteredAlliances.find((name) => name === alliance.toUpperCase())) {
      this.alreadyFilteredPlayers.push(nickname.toUpperCase());
    }

    /* Position */
    const posX = getParam(Parameters, PM.posX, null, 'NewCharacter: posX');
    const posY = getParam(Parameters, PM.posY, null, 'NewCharacter: posY');
    
    let pos = null;
    if (posX !== null && posY !== null) {
        pos = { posX: posX, posY: posY };
    } else {
        // We have to rely on a future Move or Cast event?
        console.warn(`[PlayersHandler] Missing position in NewCharacter event for ${nickname}`);
        pos = { posX: 0, posY: 0 };
    }

    /* Health */
    const currentHealth = getParam(Parameters, PM.currentHealth, 0, 'NewCharacter');
    const initialHealth = getParam(Parameters, PM.initialHealth, 0, 'NewCharacter');

    /* Items & flag */
    const items = getParam(Parameters, PM.items, null, 'NewCharacter');
    const flagId = getParam(Parameters, PM.flagId, 0, 'NewCharacter');

    this.addPlayer(
      pos.posX,
      pos.posY,
      id,
      nickname,
      guildName,
      currentHealth,
      initialHealth,
      items,
      this.settings.settingSound,
      flagId,
      alliance
    );
  }

  handleMountedPlayerEvent(id, parameters) {
    const ten = getParam(parameters, PM_MOUNT.param10, null, 'Mounted');
    const mounted = getParam(parameters, PM_MOUNT.mounted, null, 'Mounted');

    if (mounted == "true" || mounted == true) {
      this.updatePlayerMounted(id, true);
    } else if (ten == "-1") {
      this.updatePlayerMounted(id, true);
    } else {
      this.updatePlayerMounted(id, false);
    }
  }

  addPlayer(
    posX,
    posY,
    id,
    nickname,
    guildName,
    currentHealth,
    initialHealth,
    items,
    sound,
    flagId,
    alliance
  ) {
    const existingPlayer = this.playersInRange.find((player) => player.id === id);

    if (existingPlayer) return;

    const player = new Player(
      posX,
      posY,
      id,
      nickname,
      guildName,
      currentHealth,
      initialHealth,
      items,
      flagId,
      alliance
    );
    this.playersInRange.push(player);

    if (!sound) return;

    const audio = new Audio("/sounds/player.mp3");

    // Get volume from the player volume slider (converted from 0-100 to 0.0-1.0 range)
    const volume = document.getElementById("playerVolumeSlider").value / 100;
    audio.volume = volume;

    audio.play();
  }

  updateLocalPlayerNextPosition(posX, posY) {
    // TODO: Implement update local player next position
    throw new Error("Not implemented");
  }

  updatePlayerMounted(id, mounted) {
    for (const player of this.playersInRange) {
      if (player.id === id) {
        player.setMounted(mounted);
        break;
      }
    }
  }

  removePlayer(id) {
    this.playersInRange = this.playersInRange.filter((player) => player.id !== id);
  }

  updateLocalPlayerPosition(posX, posY) {
    // Implement a local player lock mechanism
    this.localPlayer.posX = posX;
    this.localPlayer.posY = posY;
  }

  localPlayerPosX() {
    // Implement a local player lock mechanism
    return this.localPlayer.posX;
  }

  localPlayerPosY() {
    // Implement a local player lock mechanism
    return this.localPlayer.posY;
  }

  updatePlayerPosition(id, posX, posY) {
    for (const player of this.playersInRange) {
      if (player.id === id) {
        player.posX = posX;
        player.posY = posY;
      }
    }
  }

  UpdatePlayerHealth(Parameters) {
    const healthId = getParam(Parameters, PM_HEALTH.id, null, 'HealthUpdate');
    var uPlayer = this.playersInRange.find((player) => player.id === healthId);

    if (!uPlayer) return;

    uPlayer.currentHealth = getParam(Parameters, PM_HEALTH.currentHealth, uPlayer.currentHealth, 'HealthUpdate');
    uPlayer.initialHealth = getParam(Parameters, PM_HEALTH.initialHealth, uPlayer.initialHealth, 'HealthUpdate');
  }

  clear() {
    this.playersInRange = [];
  }
}
