import { Readable } from "stream";

export class UpdateUserAvatarCommand {
  public constructor(private readonly userId: string, private readonly avatar: Readable) {}
}
