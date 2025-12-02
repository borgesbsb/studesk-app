# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Studesk" [level=1] [ref=e6]
      - paragraph [ref=e7]: Faça login para continuar
    - generic [ref=e8]:
      - generic [ref=e9]: Email ou senha inválidos
      - generic [ref=e10]:
        - generic [ref=e11]: Email
        - textbox "Email" [ref=e12]:
          - /placeholder: seu@email.com
          - text: user1@test.com
      - generic [ref=e13]:
        - generic [ref=e14]: Senha
        - textbox "Senha" [ref=e15]:
          - /placeholder: ••••••••
          - text: "123456"
      - button "Entrar" [ref=e16]
    - paragraph [ref=e18]:
      - text: Não tem uma conta?
      - link "Criar conta" [ref=e19] [cursor=pointer]:
        - /url: /register
    - paragraph [ref=e21]:
      - text: "Credenciais padrão para teste:"
      - text: borges.bnjamin@gmail.com / 123456
  - region "Notifications alt+T"
  - alert [ref=e22]
  - button "Open Next.js Dev Tools" [ref=e28] [cursor=pointer]:
    - img [ref=e29]
```