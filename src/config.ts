import Phaser from 'phaser';

export default {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#33A5E7',
    pixelArt: true,
    zoom: 0,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    scale: {
        width: '100%',
        height: '100%',
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
