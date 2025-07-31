import { AutomapperProfile, InjectMapper } from "@automapper/nestjs";
import { Injectable } from "@nestjs/common";
import { createMap, Mapper } from "@automapper/core";
import { SignupDto } from "@ourtransfer/dto";
import { User } from "../../user/entities/user.entity";

@Injectable()
export class AuthMapper extends AutomapperProfile {
  public constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  public override get profile() {
    return (mapper: Mapper): void => {
      createMap(mapper, SignupDto, User);
      // Additional mappings can be added here as needed
    };
  }
}
