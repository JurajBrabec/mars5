const path = require('path');
const { Actions } = require('../TextParser');
const { Column, Set } = Actions;

class Images {
  constructor(netBackup) {
    this.description = 'Reading images...';
    this.process = {
      file: path.join(netBackup.bin, 'admincmd', 'bpimmedia.exe'),
      args: ['-l'],
    };
    this.parser = [
      Set.delimiter(/(\r?\n(?=IMAGE))/),
      Set.separator(' '),
      Column.expect(/^IMAGE/),
      Set.external(this.parse),
    ];
    this.tables = {
      bpimmedia: [
        { masterServer: netBackup.masterServer, key: true },
        { name: 'string' },
        { version: 'number' },
        { backupId: 'string', key: true },
        { policy_name: 'string' },
        { policy_type: 'number' },
        { sched_label: 'string' },
        { sched_type: 'number' },
        { retention: 'number' },
        { num_files: 'number' },
        { expiration: 'number' },
        { compression: 'number' },
        { encryption: 'number' },
        { hold: 'number' },
      ],
      bpimmedia_frags: [
        { masterServer: netBackup.masterServer, key: true },
        { backupId: 'string', key: true },
        { copy_number: 'number', key: true },
        { fragment_number: 'number', key: true },
        { kilobytes: 'number' },
        { remainder: 'number' },
        { media_type: 'number' },
        { density: 'number' },
        { file_number: 'number' },
        { id_path: 'string' },
        { host: 'string' },
        { block_size: 'number' },
        { offset: 'number' },
        { media_date: 'number' },
        { device_written_on: 'number' },
        { f_flags: 'number' },
        { media_descriptor: 'string' },
        { expiration: 'number' },
        { mpx: 'number' },
        { retention_level: 'number' },
        { checkpoint: 'number' },
        { copy_on_hold: 'number' },
      ],
    };
  }
  parse = (text) => {
    const images = [];
    const frags = [];
    text.split(/\r?\n(?=IMAGE)/).map((text) =>
      text
        .split(/\r?\n/)
        .filter((item) => item.length)
        .map((line, index) => {
          if (index) {
            const frag = line
              .split(' ')
              .filter((item) => !/FRAG/.test(item))
              .map((item) => (item === '*NULL*' ? null : item));
            frag.unshift(this.backupId);
            frags.push(frag);
          } else {
            const image = line
              .split(' ')
              .filter((item) => !/IMAGE/.test(item))
              .map((item) => (item === '*NULL*' ? null : item));
            images.push(image);
            this.backupId = image[2];
          }
        })
    );
    return [images, frags];
  };
}

class ImagesAll extends Images {
  constructor(netBackup, clients) {
    super(netBackup);
    this.description = 'Reading all images...';
    this.process.args.push('-client', clients);
  }
}
class ImagesClient extends Images {
  constructor(netBackup, client) {
    super(netBackup);
    this.description = `Reading images for host '${client}'...`;
    this.process.args.push('-client', client);
  }
}
class ImagesDaysBack extends Images {
  constructor(netBackup, daysBack) {
    super(netBackup);
    this.description = `Reading images for ${daysBack} days back...`;
    this.process.args.push('-d', netBackup.dateDiff(daysBack));
  }
}

module.exports = { Images, ImagesAll, ImagesClient, ImagesDaysBack };
