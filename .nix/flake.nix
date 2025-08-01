{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
    devshell.url = "github:numtide/devshell";
    devshell.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs@{ self, ... }:
    inputs.flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import inputs.nixpkgs {
          inherit system;
          overlays = [ inputs.devshell.overlays.default ];
        };
        node = pkgs.nodejs_24;
        yarn = pkgs.yarn-berry;
      in
      {
        devShell = pkgs.devshell.mkShell {
          imports = [{
            name = "devshell";
            packages = [
              node
              yarn
              pkgs.deno
            ];

            env = [
              {
                name = "PATH";
                prefix = "node_modules/.bin";
              }
            ];

            commands = [
            ];
          }];
        };
      });
}

