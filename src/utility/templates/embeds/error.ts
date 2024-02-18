import EmbedBuilder from "./default";

export default class ErrorEmbed extends EmbedBuilder {
  constructor() {
    super();

    this.setTitle("Internal Error");
    this.setColor("Red");
    this.setThumbnail(
      "https://cdn.discordapp.com/attachments/1121061240224096349/1208281700862394428/2.png?ex=65e2b706&is=65d04206&hm=e718e289c2bcddb2deae46768709a1e77a36a5b8c45d611a7fc1889cb4ad5424&"
    );
  }
}
