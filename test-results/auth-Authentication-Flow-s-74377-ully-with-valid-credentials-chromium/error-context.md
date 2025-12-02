# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Studesk" [level=1] [ref=e6]
      - paragraph [ref=e7]: Faça login para continuar
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]:
          - /placeholder: seu@email.com
          - text: user1@test.com
      - generic [ref=e12]:
        - generic [ref=e13]: Senha
        - textbox "Senha" [ref=e14]:
          - /placeholder: ••••••••
          - text: "123456"
      - button "Entrando..." [disabled] [ref=e15]
    - paragraph [ref=e17]:
      - text: Não tem uma conta?
      - link "Criar conta" [ref=e18] [cursor=pointer]:
        - /url: /register
    - paragraph [ref=e20]:
      - text: "Credenciais padrão para teste:"
      - text: borges.bnjamin@gmail.com / 123456
  - region "Notifications alt+T"
  - alert [ref=e21]
  - button "Open Next.js Dev Tools" [ref=e27] [cursor=pointer]:
    - img [ref=e28]
```