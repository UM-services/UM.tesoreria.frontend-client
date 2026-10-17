import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.base.config.mjs";

export default [
    ...nx.configs["flat/angular"],
    ...nx.configs["flat/angular-template"],
    ...baseConfig,
    {
        files: [
            "**/*.ts"
        ],
        rules: {
            "@angular-eslint/directive-selector": [
                "error",
                {
                    type: "attribute",
                    prefix: "app",
                    style: "camelCase"
                }
            ],
            "@angular-eslint/component-selector": [
                "error",
                {
                    type: "element",
                    prefix: "app",
                    style: "kebab-case"
                }
            ]
        }
    },
    {
        files: [
            "**/*.html"
        ],
        rules: {}
    },

  {
    files: ['**/*.ts'],
    rules: {
      // Angular 22 cambió el default a OnPush; la migración conservó el comportamiento
      // previo con ChangeDetectionStrategy.Eager. Migrar a OnPush es una tarea aparte.
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
    },
  },
];
