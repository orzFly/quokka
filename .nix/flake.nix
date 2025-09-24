{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    nixpkgs-unstable.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devshell.url = "github:numtide/devshell";
    devshell.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    inputs@{ self, ... }:
    inputs.flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import inputs.nixpkgs {
          inherit system;
          overlays = [ inputs.devshell.overlays.default ];
        };
        unstable-pkgs = import inputs.nixpkgs-unstable {
          inherit system;
        };
      in
      {
        devShell = pkgs.devshell.mkShell {
          imports = [
            {
              name = "devshell";
              packages = [
                pkgs.nixd
                pkgs.nixfmt-rfc-style
                unstable-pkgs.deno
              ];

              env = [
                {
                  name = "PATH";
                  prefix = "node_modules/.bin";
                }
              ];

              commands = [
              ];
            }
          ];
        };
      }
    );
}
